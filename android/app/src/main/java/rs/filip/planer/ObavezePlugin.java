package rs.filip.planer;

import android.content.SharedPreferences;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.HashSet;

@CapacitorPlugin(name = "Obaveze")
public class ObavezePlugin extends Plugin {

    static ObavezePlugin instance;

    @Override
    public void load() {
        instance = this;
    }

    @Override
    protected void handleOnDestroy() {
        if (instance == this) instance = null;
    }

    void fireDone(String key, long at) {
        JSObject d = new JSObject();
        d.put("key", key);
        d.put("at", at);
        notifyListeners("done", d, true);
    }

    @PluginMethod
    public void sync(PluginCall call) {
        JSArray items = call.getArray("items", new JSArray());
        // aplikacija je primenila sve "gotovo" — lista koju šalje je sveža
        ObligationNotifier.prefs(getContext()).edit().putStringSet("done_keys", new HashSet<>()).apply();
        ObligationNotifier.post(getContext(), items);
        call.resolve();
    }

    @PluginMethod
    public void scheduleDay(PluginCall call) {
        String date = call.getString("date");
        long at = call.getData().optLong("at");
        JSArray items = call.getArray("items", new JSArray());
        if (date != null) ObligationNotifier.scheduleDay(getContext(), date, at, items);
        call.resolve();
    }

    @PluginMethod
    public void takePending(PluginCall call) {
        SharedPreferences p = ObligationNotifier.prefs(getContext());
        JSArray out;
        try {
            out = new JSArray(p.getString("pending", "[]"));
        } catch (Exception e) {
            out = new JSArray();
        }
        p.edit().putString("pending", "[]").apply();
        JSObject r = new JSObject();
        r.put("items", out);
        call.resolve(r);
    }

    @PluginMethod
    public void clear(PluginCall call) {
        ObligationNotifier.clearAll(getContext());
        call.resolve();
    }
}
