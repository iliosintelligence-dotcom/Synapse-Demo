package dev.synapsecore.app;

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Draw behind the status bar and the camera cut-out; the pages keep their own content below them.
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);
    }
}
