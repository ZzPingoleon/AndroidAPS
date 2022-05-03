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
 * Created by mike on 05.08.2016.
 */
public class SourceXdripPluginManual extends PluginBase implements BgSourceInterface {
    private static Logger log = LoggerFactory.getLogger(L.BGSOURCE);

    private static SourceXdripPluginManual plugin = null;

    boolean advancedFiltering;

    public static SourceXdripPluginManual getPlugin() {
        if (plugin == null)
            plugin = new SourceXdripPluginManual();
        return plugin;
    }

    private SourceXdripPluginManual() {
        super(new PluginDescription()
                .mainType(PluginType.BGSOURCE)
                .fragmentClass(BGSourceFragment.class.getName())
                .pluginName(R.string.xdrip)
                .description(R.string.description_source_xdrip_manual)
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
            log.debug("Received xDrip data: " + BundleLogger.log(intent.getExtras()));

        BgReading bgReading = new BgReading();

        bgReading.value = bundle.getDouble(Intents.ACTION_REMOTE_CALIBRATION);
        bgReading.direction = bundle.getString(Intents.EXTRA_BG_SLOPE_NAME);
        bgReading.date = bundle.getLong(Intents.EXTRA_TIMESTAMP);
        bgReading.raw = bundle.getDouble(Intents.EXTRA_RAW);
        String source = "Manual Xdrip application";
        SourceXdripPlugin.getPlugin().setSource(source);
        MainApp.getDbHelper().createIfNotExists(bgReading, "XDRIP");
        
        log.debug("Manually generated BG: $bgReading.value");
    }

    public void setSource(String source) {
        this.advancedFiltering = source.contains("G5 Native")||source.contains("G6 Native");
    }
}
