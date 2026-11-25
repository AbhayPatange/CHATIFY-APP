package com.abhay.pinglet;

import android.app.Activity;
import android.content.Intent;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;

@CapacitorPlugin(name = "DocumentSaver")
public class DocumentSaver extends Plugin {
    private byte[] pending;

    @PluginMethod
    public synchronized void save(PluginCall call) {
        String encoded = call.getString("bytes");
        if (pending != null || encoded == null || encoded.length() > 2796204) {
            call.reject("Cannot save this attachment right now.");
            return;
        }
        try {
            pending = Base64.decode(encoded, Base64.DEFAULT);
            call.getData().remove("bytes");
            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("application/octet-stream");
            intent.putExtra(Intent.EXTRA_TITLE, call.getString("name", "attachment"));
            startActivityForResult(call, intent, "writeDocument");
        } catch (RuntimeException error) {
            pending = null;
            call.reject("Could not open the document picker.");
        }
    }

    @ActivityCallback
    private synchronized void writeDocument(PluginCall call, ActivityResult result) {
        byte[] bytes = pending;
        pending = null;
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK) { call.resolve(); return; }
        if (bytes == null || result.getData() == null || result.getData().getData() == null) {
            call.reject("Choose Download again to save this document.");
            return;
        }
        getBridge().execute(() -> {
            try (OutputStream output = getContext().getContentResolver().openOutputStream(result.getData().getData(), "wt")) {
                if (output == null) throw new java.io.IOException();
                output.write(bytes);
            } catch (Exception error) {
                call.reject("Could not write the document.");
                return;
            }
            call.resolve();
        });
    }
}
