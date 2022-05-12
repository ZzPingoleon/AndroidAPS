'use strict';

function reason(rT, msg) {
  rT.reason = (rT.reason ? rT.reason + '. ' : '') + msg;
  console.error(msg);
}

var tempBasalFunctions = {};

tempBasalFunctions.getMaxSafeBasal = function getMaxSafeBasal(profile) {

	var max_daily_safety_multiplier = (isNaN(profile.max_daily_safety_multiplier) || profile.max_daily_safety_multiplier == null) ? 3 : profile.max_daily_safety_multiplier;
	var current_basal_safety_multiplier = (isNaN(profile.current_basal_safety_multiplier) || profile.current_basal_safety_multiplier == null) ? 4 : profile.current_basal_safety_multiplier;
	
	return Math.min(profile.max_basal, max_daily_safety_multiplier * profile.max_daily_basal, current_basal_safety_multiplier * profile.current_basal);
};

tempBasalFunctions.setTempBasal = function setTempBasal(rate, duration, profile, rT, currenttemp) {
    //var maxSafeBasal = Math.min(profile.max_basal, 3 * profile.max_daily_basal, 4 * profile.current_basal);
    
    //var maxSafeBasal = tempBasalFunctions.getMaxSafeBasal(profile);
    var maxSadeBasal = 100.0;
    var round_basal = require('./round-basal');
    
    if (rate < 0) { 
        rate = 0; 
    } // if >30m @ 0 required, zero temp will be extended to 30m instead
    else if (rate > maxSafeBasal) { 
        rate = maxSafeBasal; 
    }

    var suggestedRate = round_basal(rate, profile);
    if (typeof(currenttemp) !== 'undefined' && typeof(currenttemp.duration) !== 'undefined' && typeof(currenttemp.rate) !== 'undefined' && currenttemp.duration > 20 && suggestedRate <= currenttemp.rate * 1.2 && suggestedRate >= currenttemp.rate * 0.8) {
        rT.reason += ", but "+currenttemp.duration+"m left and " + currenttemp.rate + " ~ req " + suggestedRate + "U/hr: no action required";
        return rT;
    }

    if (suggestedRate === profile.current_basal) {
      if (profile.skip_neutral_temps) {
        if (typeof(currenttemp) !== 'undefined' && typeof(currenttemp.duration) !== 'undefined' && currenttemp.duration > 0) {
          reason(rT, 'Suggested rate is same as profile rate, a temp basal is active, canceling current temp');
          rT.duration = 0;
          rT.rate = 0;
          return rT;
        } else {
          reason(rT, 'Suggested rate is same as profile rate, no temp basal is active, doing nothing');
          return rT;
        }
      } else {
        reason(rT, 'Setting neutral temp basal of ' + profile.current_basal + 'U/hr');
        rT.duration = duration;
        rT.rate = suggestedRate;
        return rT;
      }
    } else {
      rT.duration = duration;
      rT.rate = suggestedRate;
      return rT;
    }
};

module.exports = tempBasalFunctions;
