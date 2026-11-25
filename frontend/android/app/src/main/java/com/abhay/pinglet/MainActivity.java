package com.abhay.pinglet;

import android.os.Bundle;
import android.webkit.CookieManager;
import android.widget.Toast;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private long lastBackPress;
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DocumentSaver.class);
        super.onCreate(savedInstanceState);
        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(getBridge().getWebView(), true);
    }

    @Override
    public void onBackPressed() {
        if (getBridge() == null || getBridge().getWebView() == null) return;
        getBridge().getWebView().evaluateJavascript(
            "window.dispatchEvent(new CustomEvent('pinglet:back', {cancelable:true}))",
            result -> {
                if ("false".equals(result)) { lastBackPress = 0; return; }
                long now = android.os.SystemClock.elapsedRealtime();
                if (now - lastBackPress < 2000) {
                    moveTaskToBack(true);
                    lastBackPress = 0;
                } else {
                    lastBackPress = now;
                    Toast.makeText(this, "Press back again to leave Pinglet", Toast.LENGTH_SHORT).show();
                }
            }
        );
    }
}
