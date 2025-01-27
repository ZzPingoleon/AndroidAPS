package info.nightscout.androidaps.plugins.source;

import android.content.Intent;
import android.os.Bundle;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import info.nightscout.androidaps.MainApp;
import info.nightscout.androidaps.R;
import info.nightscout.androidaps.logging.L;
import info.nightscout.androidaps.services.Intents;
import info.nightscout.androidaps.db.BgReading;
import info.nightscout.androidaps.interfaces.BgSourceInterface;
import info.nightscout.androidaps.interfaces.PluginBase;
import info.nightscout.androidaps.interfaces.PluginDescription;
import info.nightscout.androidaps.interfaces.PluginType;
import info.nightscout.androidaps.logging.BundleLogger;

/**
 * Created by ls2n on 05.07.2022.
 */
public class SourceVirtualPatientPlugin extends PluginBase implements BgSourceInterface {
    private static Logger log = LoggerFactory.getLogger(L.BGSOURCE);

    private static SourceVirtualPatientPlugin plugin = null;

    boolean advancedFiltering;

    public static SourceVirtualPatientPlugin getPlugin() {
        if (plugin == null)
            plugin = new SourceVirtualPatientPlugin();
        return plugin;
    }

    private SourceVirtualPatientPlugin() {
        super(new PluginDescription()
                .mainType(PluginType.BGSOURCE)
                .fragmentClass(BGSourceFragment.class.getName())
                .pluginName(R.string.virtual_patient)
                .preferencesId(R.xml.pref_virtual_patient)
                .description(R.string.description_source_virtual_patient)
        );
    }

    @Override
    public boolean advancedFilteringSupported() {
        return advancedFiltering;
    }

    @Override
    public void handleNewData(Intent intent) {

        if (!isEnabled(PluginType.BGSOURCE)) return;

        Bundle bundle = intent.getExtras();
        if (bundle == null) return;

        if (L.isEnabled(L.BGSOURCE))
            log.debug("Received data: " + BundleLogger.log(intent.getExtras()));

        BgReading bgReading = new BgReading();

        bgReading.value = bundle.getDouble(Intents.ACTION_REMOTE_CALIBRATION);
        bgReading.direction = bundle.getString(Intents.EXTRA_BG_SLOPE_NAME);
        bgReading.date = bundle.getLong(Intents.EXTRA_TIMESTAMP);
        bgReading.raw = bundle.getDouble(Intents.EXTRA_RAW);
        String source = "Virtual patient application";
        SourceVirtualPatientPlugin.getPlugin().setSource(source);
        MainApp.getDbHelper().createIfNotExists(bgReading, "VIRTUAL_PATIENT");
        
        log.debug("Automaticallly generated BG: $bgReading.value");
    }

    public void setSource(String source) {
        this.advancedFiltering = true;
    }
}
