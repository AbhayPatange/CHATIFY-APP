package com.abhay.pinglet;

import android.content.*;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import androidx.core.app.RemoteInput;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import java.util.UUID;

@CapacitorPlugin(name="MessageAlerts", permissions={
    @Permission(alias="alerts", strings={"android.permission.POST_NOTIFICATIONS"})
})
public class MessageAlerts extends Plugin {
    private JSObject pending;
    private synchronized void capture(Intent intent) {
        if (intent == null || intent.getData() == null) return;
        SharedPreferences p = MessagePoll.prefs(getContext());
        Uri uri=intent.getData();
        String nonce=p.getString("nonce",null);
        if (nonce==null || !nonce.equals(intent.getStringExtra("alertNonce")) || !"pinglet-alert".equals(uri.getScheme())
            || !p.getString("owner","").equals(uri.getAuthority()) || uri.getPathSegments().size()!=2) return;
        String peer=uri.getPathSegments().get(0), action=uri.getLastPathSegment();
        JSObject value=new JSObject(); value.put("owner",uri.getAuthority()); value.put("peer",peer); value.put("action",action);
        if ("reply".equals(action)) {
            Bundle results=RemoteInput.getResultsFromIntent(intent);
            CharSequence text=results==null ? null : results.getCharSequence("replyText");
            if (text==null || text.length()>2000 || text.toString().trim().isEmpty()) return;
            value.put("text",text.toString().trim());
        }
        pending=value; intent.removeExtra("alertNonce");
        notifyListeners("action",new JSObject());
    }
    @Override public void load() { capture(getActivity().getIntent()); }
    @Override protected void handleOnNewIntent(Intent intent) { capture(intent); }
    @PluginMethod public synchronized void takeAction(PluginCall call) {
        if (pending==null) call.resolve(new JSObject()); else { call.resolve(pending); pending=null; }
    }
    @PluginMethod public void configure(PluginCall call) {
        String owner=call.getString("owner","");
        if (owner.isEmpty()) { MessagePoll.stop(getContext()); call.resolve(); return; }
        if (!owner.matches("[a-f0-9]{24}")) { call.reject("Invalid account"); return; }
        if (Build.VERSION.SDK_INT>=33 && !MessagePoll.permitted(getContext()) && call.getBoolean("prompt",false)) {
            requestPermissionForAlias("alerts",call,"afterRequest"); return;
        }
        afterRequest(call);
    }
    @PermissionCallback private void afterRequest(PluginCall call) {
        boolean allowed=MessagePoll.permitted(getContext()) && getContext().getSystemService(android.app.NotificationManager.class).areNotificationsEnabled();
        if (allowed) {
            SharedPreferences p=MessagePoll.prefs(getContext());
            String owner=call.getString("owner","");
            if (!owner.equals(p.getString("owner",""))) {
                MessagePoll.stop(getContext());
                p.edit().putString("owner",owner).putString("nonce",UUID.randomUUID().toString()).apply();
            }
            MessagePoll.channel(getContext()); MessagePoll.schedule(getContext());
        } else MessagePoll.stop(getContext());
        JSObject result=new JSObject(); result.put("allowed",allowed); call.resolve(result);
    }
    @PluginMethod public void disable(PluginCall call) { MessagePoll.stop(getContext()); call.resolve(); }
    @PluginMethod public void post(PluginCall call) {
        MessagePoll.show(getContext(),call.getString("owner",""),call.getString("peer",""),call.getString("name","Pinglet"),call.getInt("count",1),call.getString("latest",""));
        call.resolve();
    }
    @PluginMethod public void clear(PluginCall call) { MessagePoll.clear(getContext(),call.getString("peer",""));call.resolve(); }
}
