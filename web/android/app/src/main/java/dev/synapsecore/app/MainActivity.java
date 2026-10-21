package dev.synapsecore.app;

import android.os.Bundle;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.activity.EdgeToEdge;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.webkit.ScriptHandler;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import com.getcapacitor.BridgeActivity;
import java.util.Collections;

/**
 * The app draws edge to edge: the page's background runs behind the status bar and the camera cut-out, like any modern phone app.
 * What must not go there is what a person reads or taps, so each page keeps its bars below it. How far below is the height of the
 * system bars and the cut-out, and a page cannot always find that out for itself: before Chrome 140 an Android WebView reports 0 for
 * env(safe-area-inset-*). So the app measures it here, in CSS pixels, and hands it to the page as CSS variables
 * (--syn-native-top, -bottom, -left, -right) before the page paints, and again whenever it changes (rotation, a different bar).
 * public/app/native.js turns those into --syn-top and --syn-bottom, which the pages' stylesheets use.
 */
public class MainActivity extends BridgeActivity {
    private static final String ORIGIN = "https://www.synapsecore.dev";

    private volatile int top, bottom, left, right; // CSS pixels
    private ScriptHandler startScript;

    /** window.SynInsets.top() and so on: the page can ask for the numbers itself, in case the start script could not run. */
    public class InsetsBridge {
        @JavascriptInterface public int top() { return top; }
        @JavascriptInterface public int bottom() { return bottom; }
        @JavascriptInterface public int left() { return left; }
        @JavascriptInterface public int right() { return right; }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // the launch theme has an action bar (a cream title bar over the page); this is the theme without one
        setTheme(R.style.AppTheme_NoActionBar);
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);

        final WebView webView = getBridge().getWebView();
        webView.addJavascriptInterface(new InsetsBridge(), "SynInsets");

        final View decor = getWindow().getDecorView();
        ViewCompat.setOnApplyWindowInsetsListener(decor, (v, windowInsets) -> {
            Insets bars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            float density = getResources().getDisplayMetrics().density;
            top = Math.round(bars.top / density);
            bottom = Math.round(bars.bottom / density);
            left = Math.round(bars.left / density);
            right = Math.round(bars.right / density);
            publish(webView);
            // not consumed: the web view still gets the whole screen
            return ViewCompat.onApplyWindowInsets(v, windowInsets);
        });
        ViewCompat.requestApplyInsets(decor);
    }

    private void publish(final WebView webView) {
        final String js = "(function(){var d=document.documentElement;d.classList.add('syn-app');var s=d.style;"
            + "s.setProperty('--syn-native-top','" + top + "px');s.setProperty('--syn-native-bottom','" + bottom + "px');"
            + "s.setProperty('--syn-native-left','" + left + "px');s.setProperty('--syn-native-right','" + right + "px');})();";
        webView.post(() -> {
            // before the next page paints, where the WebView can run a script at document start
            if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
                if (startScript != null) startScript.remove();
                startScript = WebViewCompat.addDocumentStartJavaScript(webView, js, Collections.singleton(ORIGIN));
            }
            // and on the page that is already showing
            webView.evaluateJavascript(js, null);
        });
    }
}
