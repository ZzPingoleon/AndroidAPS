package info.nightscout.androidaps.plugins.source;

import android.content.Intent;
import android.os.Bundle;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import info.nightscout.androidaps.Constants;
import info.nightscout.androidaps.MainApp;
import info.nightscout.androidaps.R;
import info.nightscout.androidaps.db.BgReading;
import info.nightscout.androidaps.interfaces.BgSourceInterface;
import info.nightscout.androidaps.interfaces.PluginBase;
import info.nightscout.androidaps.interfaces.PluginDescription;
import info.nightscout.androidaps.interfaces.PluginType;
import info.nightscout.androidaps.logging.L;
import info.nightscout.androidaps.utils.JsonHelper;
import info.nightscout.androidaps.plugins.general.nsclient.NSUpload;
import info.nightscout.androidaps.utils.SP;

/**
 * Created by mike on 05.08.2016.
 */
public class ManualPlugin extends PluginBase implements BgSourceInterface {
    private static Logger log = LoggerFactory.getLogger(L.BGSOURCE);

    private static ManualPlugin plugin = null;

    public static ManualPlugin getPlugin() {
        if (plugin == null)
            plugin = new ManualPlugin();
        return plugin;
    }

    private ManualPlugin() {
        super(new PluginDescription()
                .mainType(PluginType.BGSOURCE)
                .fragmentClass(BGSourceFragment.class.getName())
                .pluginName(R.string.source_manual)
                .preferencesId(R.xml.pref_manual)
                .description(R.string.description_source_manual)
        );
    }

    @Override
    public boolean advancedFilteringSupported() {
        return false;
    }

    @Override
    public void handleNewData(Intent intent) {

        if (!isEnabled(PluginType.BGSOURCE)) return
            
        Double bg_manual_default=100.0;
        Double bg_manual = SP.getDouble(R.string.key_manual_constant, bg_manual_default));
        
        val bgReading = BgReading()
        bgReading.value = bg_manual
        bgReading.date = DateUtil.now()
        bgReading.raw = bg_manual
        MainApp.getDbHelper().createIfNotExists(bgReading, "ConstantManualEntry")
        log.debug("Generated constant entry: $bgReading")
    }

}
