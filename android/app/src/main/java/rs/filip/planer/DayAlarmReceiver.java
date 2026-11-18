package rs.filip.planer;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class DayAlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String date = intent.getStringExtra("date");
        if (date != null) ObligationNotifier.fireDay(context, date);
    }
}
