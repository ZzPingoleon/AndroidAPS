package info.nightscout.androidaps.plugins.source

import android.content.Intent
import android.os.Handler
import info.nightscout.androidaps.MainApp
import info.nightscout.androidaps.R
import info.nightscout.androidaps.db.BgReading
import info.nightscout.androidaps.interfaces.BgSourceInterface
import info.nightscout.androidaps.interfaces.PluginBase
import info.nightscout.androidaps.interfaces.PluginDescription
import info.nightscout.androidaps.interfaces.PluginType
import info.nightscout.androidaps.logging.L
import info.nightscout.androidaps.plugins.pump.virtual.VirtualPumpPlugin
import info.nightscout.androidaps.utils.DateUtil
import info.nightscout.androidaps.utils.T
import info.nightscout.androidaps.utils.isRunningTest
import info.nightscout.androidaps.utils.SP
import org.slf4j.LoggerFactory
import java.util.*
import kotlin.math.PI
import kotlin.math.sin

object ManualPlugin : PluginBase(PluginDescription()
        .mainType(PluginType.BGSOURCE)
        .fragmentClass(BGSourceFragment::class.java.name)
        .pluginName(R.string.source_manual)
        .preferencesId(R.xml.pref_manual)
        .description(R.string.description_source_manual)), BgSourceInterface {

    private val log = LoggerFactory.getLogger(L.BGSOURCE)

    private val loopHandler = Handler()
    private lateinit var refreshLoop: Runnable

    const val interval = 1L // minutes

    init {
        refreshLoop = Runnable {
            handleNewData(Intent())
            loopHandler.postDelayed(refreshLoop, T.mins(interval).msecs())
        }
    }

    override fun advancedFilteringSupported(): Boolean {
        return true
    }

    override fun onStart() {
        super.onStart()
        loopHandler.postDelayed(refreshLoop, T.mins(interval).msecs())
    }

    override fun onStop() {
        super.onStop()
        loopHandler.removeCallbacks(refreshLoop)
    }

    override fun specialEnableCondition(): Boolean {
        return true
    }

    override fun handleNewData(intent: Intent) {
        if (!isEnabled(PluginType.BGSOURCE)) return
           
        val bg_manual_default=100.0
        val bg_manual = SP.getDouble(R.string.key_manual_constant, bg_manual_default)

        val bgReading = BgReading()
        bgReading.value = bg_manual
        bgReading.date = DateUtil.now()
        bgReading.raw = bg_manual
        MainApp.getDbHelper().createIfNotExists(bgReading, "Manual")
        log.debug("Generated BG: $bgReading")
    }
}
