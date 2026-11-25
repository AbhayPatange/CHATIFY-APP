package com.abhay.pinglet;

import android.app.*;
import android.app.job.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.webkit.CookieManager;
import androidx.core.app.NotificationCompat;
import androidx.core.app.RemoteInput;
import org.json.*;
import java.net.*;
import java.io.*;
import java.util.*;

public class MessagePoll extends JobService {
    static final int JOB = 41361;
    static final String CHANNEL = "chat_messages";
    static final String API = "https://api.pinglet.site/api/settings/unread";
    static SharedPreferences prefs(Context c) { return c.getSharedPreferences("message-alerts", MODE_PRIVATE); }
    static boolean permitted(Context c) {
        return Build.VERSION.SDK_INT < 33 || c.checkSelfPermission("android.permission.POST_NOTIFICATIONS") == PackageManager.PERMISSION_GRANTED;
    }
    static void schedule(Context c) {
        JobScheduler jobs = c.getSystemService(JobScheduler.class);
        if (jobs.getPendingJob(JOB) == null) jobs.schedule(new JobInfo.Builder(JOB, new ComponentName(c, MessagePoll.class))
            .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).setPeriodic(15 * 60_000L).build());
    }
    static synchronized void stop(Context c) {
        c.getSystemService(JobScheduler.class).cancel(JOB);
        c.getSystemService(NotificationManager.class).cancelAll();
        prefs(c).edit().clear().apply();
    }
    static void channel(Context c) {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel(CHANNEL, "Messages", NotificationManager.IMPORTANCE_HIGH);
            channel.setShowBadge(true);
            c.getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
    }
    static PendingIntent action(Context c, String owner, String peer, String action) {
        Intent intent = new Intent(c, MainActivity.class).setAction("pinglet." + action)
            .setData(new Uri.Builder().scheme("pinglet-alert").authority(owner).appendPath(peer).appendPath(action).build())
            .putExtra("alertNonce", prefs(c).getString("nonce", ""))
            .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (!action.equals("reply")) flags |= PendingIntent.FLAG_IMMUTABLE;
        else if (Build.VERSION.SDK_INT >= 31) flags |= PendingIntent.FLAG_MUTABLE;
        return PendingIntent.getActivity(c, 0, intent, flags);
    }
    static synchronized void show(Context c, String owner, String peer, String name, int count, String latest) {
        SharedPreferences p = prefs(c);
        if (!owner.equals(p.getString("owner", "")) || !permitted(c) || !peer.matches("[a-f0-9]{24}") || latest.equals(p.getString("last-"+peer, ""))) return;
        channel(c);
        RemoteInput input = new RemoteInput.Builder("replyText").setLabel("Reply").build();
        NotificationCompat.Action reply = new NotificationCompat.Action.Builder(0, "Reply", action(c, owner, peer, "reply"))
            .addRemoteInput(input).setSemanticAction(NotificationCompat.Action.SEMANTIC_ACTION_REPLY).setAuthenticationRequired(true).build();
        NotificationCompat.Action read = new NotificationCompat.Action.Builder(0, "Mark as read", action(c, owner, peer, "read"))
            .setAuthenticationRequired(true).build();
        c.getSystemService(NotificationManager.class).notify(peer, 1, new NotificationCompat.Builder(c, CHANNEL)
            .setSmallIcon(android.R.drawable.stat_notify_chat).setContentTitle(name).setContentText(count == 1 ? "New message" : count + " unread messages")
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE).setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setPriority(NotificationCompat.PRIORITY_HIGH).setNumber(count).setAutoCancel(true)
            .setContentIntent(action(c, owner, peer, "open")).addAction(reply).addAction(read).build());
        p.edit().putString("last-"+peer, latest).apply();
    }
    static synchronized void clear(Context c, String peer) {
        c.getSystemService(NotificationManager.class).cancel(peer, 1);
        prefs(c).edit().remove("last-"+peer).apply();
    }
    private volatile boolean stopped;
    @Override public boolean onStartJob(JobParameters params) {
        stopped = false;
        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                String owner = prefs(this).getString("owner", "");
                String cookie = CookieManager.getInstance().getCookie(API);
                if (owner.isEmpty() || cookie == null || !permitted(this)) return;
                connection = (HttpURLConnection)new URL(API).openConnection();
                connection.setInstanceFollowRedirects(false);
                connection.setConnectTimeout(12000); connection.setReadTimeout(12000);
                connection.setRequestProperty("Cookie", cookie);
                if (connection.getResponseCode() != 200) return;
                StringBuilder json = new StringBuilder();
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(), "UTF-8"))) {
                    String line; while ((line=reader.readLine()) != null) json.append(line);
                }
                JSONObject body = new JSONObject(json.toString());
                if (stopped || !owner.equals(body.getString("owner")) || !owner.equals(prefs(this).getString("owner",""))) return;
                Set<String> old = new HashSet<>(prefs(this).getAll().keySet());
                JSONArray chats = body.getJSONArray("chats");
                for (int i=0;i<chats.length();i++) {
                    JSONObject chat=chats.getJSONObject(i); String peer=chat.getString("id");
                    old.remove("last-"+peer);
                    show(this, owner, peer, chat.getString("name"), chat.getInt("count"), chat.getString("latest"));
                }
                for (String key:old) if (key.startsWith("last-") && owner.equals(prefs(this).getString("owner",""))) clear(this,key.substring(5));
            } catch (Exception ignored) { /* The next scheduled check retries. */ }
            finally { if (connection != null) connection.disconnect(); if (!stopped) jobFinished(params,false); }
        }).start();
        return true;
    }
    @Override public boolean onStopJob(JobParameters params) { stopped=true; return false; }
}
