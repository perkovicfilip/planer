package rs.filip.planer;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ObavezePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
