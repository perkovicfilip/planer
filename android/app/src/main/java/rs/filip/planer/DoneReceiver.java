package rs.filip.planer;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class DoneReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String key = intent.getStringExtra("key");
        int id = intent.getIntExtra("id", 0);
        if (key != null) ObligationNotifier.markDone(context, key, id);
    }
}
