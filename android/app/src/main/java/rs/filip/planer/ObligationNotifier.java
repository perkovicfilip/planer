package rs.filip.planer;

import android.Manifest;
import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;

/** Današnje obaveze kao notifikacije u baru, svaka sa dugmetom "Gotovo". */
public class ObligationNotifier {

    static final String CHANNEL = "obaveze";
    static final String GROUP = "rs.filip.planer.DANAS";
    static final int SUMMARY_ID = 1;
    static final String PREFS = "planer_obaveze";
    static final String ACTION_DONE = "rs.filip.planer.DONE";
    static final String ACTION_DAY = "rs.filip.planer.DAY";

    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static void ensureChannel(Context c) {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager nm = c.getSystemService(NotificationManager.class);
            if (nm.getNotificationChannel(CHANNEL) == null) {
                NotificationChannel ch = new NotificationChannel(CHANNEL, "Današnje obaveze", NotificationManager.IMPORTANCE_LOW);
                ch.setDescription("Obaveze za danas — štikliraj ih direktno iz notifikacije");
                ch.setShowBadge(true);
                nm.createNotificationChannel(ch);
            }
        }
    }

    static boolean allowed(Context c) {
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(c, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return false;
        }
        return NotificationManagerCompat.from(c).areNotificationsEnabled();
    }

    static PendingIntent openApp(Context c) {
        Intent i = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
        if (i == null) i = new Intent(c, MainActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(c, 0, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static int parseColor(String s) {
        try {
            return Color.parseColor(s);
        } catch (Exception e) {
            return Color.parseColor("#2563eb");
        }
    }

    /** Prikaži (ili osveži) listu; ukloni one kojih više nema. */
    static void post(Context c, JSONArray items) {
        ensureChannel(c);
        if (!allowed(c)) return;
        NotificationManagerCompat nm = NotificationManagerCompat.from(c);
        SharedPreferences p = prefs(c);
        Set<String> done = new HashSet<>(p.getStringSet("done_keys", new HashSet<>()));
        Set<String> prev = new HashSet<>(p.getStringSet("posted_ids", new HashSet<>()));
        Set<String> now = new HashSet<>();
        PendingIntent open = openApp(c);

        for (int i = 0; i < items.length(); i++) {
            JSONObject it = items.optJSONObject(i);
            if (it == null) continue;
            String key = it.optString("key");
            if (done.contains(key)) continue;
            int id = it.optInt("id");
            Intent di = new Intent(c, DoneReceiver.class).setAction(ACTION_DONE).putExtra("key", key).putExtra("id", id);
            PendingIntent dpi = PendingIntent.getBroadcast(c, id, di, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            String text = it.optString("text");
            NotificationCompat.Builder b = new NotificationCompat.Builder(c, CHANNEL)
                .setSmallIcon(R.drawable.ic_stat_planer)
                .setContentTitle(it.optString("title"))
                .setColor(parseColor(it.optString("color")))
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setSilent(true)
                .setShowWhen(false)
                .setGroup(GROUP)
                .setSortKey(String.format("%03d", i))
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setCategory(NotificationCompat.CATEGORY_REMINDER)
                .setContentIntent(open)
                .addAction(0, "✓ Gotovo", dpi);
            if (!text.isEmpty()) b.setContentText(text);
            try {
                nm.notify(id, b.build());
                now.add(String.valueOf(id));
            } catch (SecurityException ignored) {}
        }
        for (String s : prev) {
            if (!now.contains(s)) {
                try { nm.cancel(Integer.parseInt(s)); } catch (NumberFormatException ignored) {}
            }
        }
        p.edit().putStringSet("posted_ids", now).apply();
        updateSummary(c, now.size());
    }

    static void updateSummary(Context c, int left) {
        NotificationManagerCompat nm = NotificationManagerCompat.from(c);
        if (left <= 0) {
            nm.cancel(SUMMARY_ID);
            return;
        }
        if (!allowed(c)) return;
        String t = left == 1 ? "Danas: još 1 obaveza" : "Danas: još " + left + " obaveza";
        NotificationCompat.Builder b = new NotificationCompat.Builder(c, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_planer)
            .setContentTitle(t)
            .setColor(Color.parseColor("#2563eb"))
            .setGroup(GROUP)
            .setGroupSummary(true)
            .setOngoing(true)
            .setSilent(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(openApp(c));
        try { nm.notify(SUMMARY_ID, b.build()); } catch (SecurityException ignored) {}
    }

    static void clearAll(Context c) {
        NotificationManagerCompat nm = NotificationManagerCompat.from(c);
        SharedPreferences p = prefs(c);
        for (String s : p.getStringSet("posted_ids", new HashSet<>())) {
            try { nm.cancel(Integer.parseInt(s)); } catch (NumberFormatException ignored) {}
        }
        nm.cancel(SUMMARY_ID);
        p.edit().putStringSet("posted_ids", new HashSet<>()).apply();
    }

    /** "Gotovo" pritisnuto: skloni notifikaciju i zapamti za aplikaciju. */
    static void markDone(Context c, String key, int id) {
        NotificationManagerCompat.from(c).cancel(id);
        SharedPreferences p = prefs(c);
        long at = System.currentTimeMillis();
        JSONArray pending;
        try {
            pending = new JSONArray(p.getString("pending", "[]"));
        } catch (Exception e) {
            pending = new JSONArray();
        }
        try {
            JSONObject o = new JSONObject();
            o.put("key", key);
            o.put("at", at);
            pending.put(o);
        } catch (Exception ignored) {}
        Set<String> done = new HashSet<>(p.getStringSet("done_keys", new HashSet<>()));
        done.add(key);
        Set<String> posted = new HashSet<>(p.getStringSet("posted_ids", new HashSet<>()));
        posted.remove(String.valueOf(id));
        p.edit().putString("pending", pending.toString()).putStringSet("done_keys", done).putStringSet("posted_ids", posted).apply();
        updateSummary(c, posted.size());
        ObavezePlugin plugin = ObavezePlugin.instance;
        if (plugin != null) plugin.fireDone(key, at);
    }

    // ---------- Liste za naredne dane (pojave se ujutru same) ----------

    static void scheduleDay(Context c, String date, long at, JSONArray items) {
        SharedPreferences p = prefs(c);
        try {
            JSONObject o = new JSONObject();
            o.put("at", at);
            o.put("items", items);
            p.edit().putString("day_" + date, o.toString()).apply();
        } catch (Exception ignored) {}
        setAlarm(c, date, at);
    }

    static void setAlarm(Context c, String date, long at) {
        if (at <= System.currentTimeMillis()) return;
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        Intent i = new Intent(c, DayAlarmReceiver.class).setAction(ACTION_DAY).putExtra("date", date);
        PendingIntent pi = PendingIntent.getBroadcast(c, date.hashCode(), i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        boolean exact = Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms();
        try {
            if (exact) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
            else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
        } catch (SecurityException e) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
        }
    }

    static void fireDay(Context c, String date) {
        SharedPreferences p = prefs(c);
        String raw = p.getString("day_" + date, null);
        if (raw == null) return;
        try {
            JSONObject o = new JSONObject(raw);
            // novi dan: stara "gotovo" stanja više ne važe
            p.edit().putStringSet("done_keys", new HashSet<>()).remove("day_" + date).apply();
            post(c, o.getJSONArray("items"));
        } catch (Exception ignored) {}
    }

    /** Posle restarta telefona ponovo postavi alarme. */
    static void restoreAlarms(Context c) {
        SharedPreferences p = prefs(c);
        for (Map.Entry<String, ?> e : p.getAll().entrySet()) {
            if (!e.getKey().startsWith("day_") || !(e.getValue() instanceof String)) continue;
            try {
                JSONObject o = new JSONObject((String) e.getValue());
                String date = e.getKey().substring(4);
                long at = o.optLong("at");
                if (at > System.currentTimeMillis()) setAlarm(c, date, at);
                else p.edit().remove(e.getKey()).apply();
            } catch (Exception ignored) {}
        }
    }
}
