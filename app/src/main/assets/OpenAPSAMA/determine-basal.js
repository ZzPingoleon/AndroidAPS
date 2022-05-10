/*
  Determine Basal

  Released under MIT license. See the accompanying LICENSE.txt file for
  full terms and conditions

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE.
*/

//variables gloables:
var x2=0.0;
var x3=0.0;
var u_prec=0.0;

var round_basal = require('../round-basal')

// Rounds value to 'digits' decimal places
function round(value, digits)
{
    var scale = Math.pow(10, digits);
    return Math.round(value * scale) / scale;
}

// we expect BG to rise or fall at the rate of BGI,
// adjusted by the rate at which BG would need to rise /
// fall to get eventualBG to target over DIA/2 hours
function calculate_expected_delta(dia, target_bg, eventual_bg, bgi) {
    // (hours * mins_per_hour) / 5 = how many 5 minute periods in dia/2
    var dia_in_5min_blocks = (dia/2 * 60) / 5;
    var target_delta = target_bg - eventual_bg;
    var expectedDelta = round(bgi + (target_delta / dia_in_5min_blocks), 1);
    return expectedDelta;
}


function convert_bg(value, profile)
{
    if (profile.out_units == "mmol/L")
    {
        return round(value / 18, 1).toFixed(1);
    }
    else
    {
        return value.toFixed(0);
    }
}

var determine_basal = function determine_basal(glucose_status, currenttemp, iob_data, profile, autosens_data, meal_data, tempBasalFunctions) {
    var rT = { //short for requestedTemp
    };

    if (typeof profile === 'undefined' || typeof profile.current_basal === 'undefined') {
        rT.error ='Error: could not get current basal rate';
        return rT;
    }
    var basal = profile.current_basal;
    if (typeof autosens_data !== 'undefined' ) {
        basal = profile.current_basal * autosens_data.ratio;
        basal = round_basal(basal, profile);
        if (basal != profile.current_basal) {
            console.error("Adjusting basal from "+profile.current_basal+" to "+basal);
        }
    }

    var bg = glucose_status.glucose;
    
    if (bg < 39) {  //Dexcom is in ??? mode or calibrating
        rT.reason = "CGM is calibrating or in ??? state";
        if (basal <= currenttemp.rate * 1.2) { // high temp is running
            rT.reason += "; setting current basal of " + basal + " as temp";
            return tempBasalFunctions.setTempBasal(basal, 30, profile, rT, currenttemp);
        } else { //do nothing.
            rT.reason += ", temp " + currenttemp.rate + " <~ current basal " + basal + "U/hr";
            return rT;
        }
    }

    var max_iob = profile.max_iob; // maximum amount of non-bolus IOB OpenAPS will ever deliver

    // if target_bg is set, great. otherwise, if min and max are set, then set target to their average
    var target_bg;
    var min_bg;
    var max_bg;
    if (typeof profile.min_bg !== 'undefined') {
            min_bg = profile.min_bg;
    }
    if (typeof profile.max_bg !== 'undefined') {
            max_bg = profile.max_bg;
    }
    if (typeof profile.target_bg !== 'undefined') {
        target_bg = profile.target_bg;
    } else {
        if (typeof profile.min_bg !== 'undefined' && typeof profile.max_bg !== 'undefined') {
            target_bg = (profile.min_bg + profile.max_bg) / 2;
        } else {
            rT.error ='Error: could not determine target_bg';
            return rT;
        }
    }

    
  
    let currentDate = new Date();
    let currentMinute=currentDate.getMinutes();
  
    var u_b=profile.Ub;
    var cf=profile.CF;
    var cir=profile.CIR;
    var dia=profile.DIA_aps;
  
    var k_d=0.85;
    var k_i=50;
    var ti=60;
    var k_c=1;
    var bg_ref=100;
    var bg_critique=50;
   
  
    k_d=u_b*cf;
    k_i=cf;
    k_c=cf/cir;
    ti=dia;
  
    //observateur d'état:
    var L1=profile.L1;
    var L2=profile.L2;
    var te=5;

    var debit_basal=k_d/k_i;
    var insuline_basal=debit_basal;
  
    
    var insuline=(bg-target_bg)/k_i-ti*(x2+x3);
  
    if (bg<target_bg){
      insuline=0;
    }
  
  
    insuline=insuline+insuline_basal;
    if (meal_data.mealCOB>0){
      insuline=insuline+meal_data.mealCOB/(k_i/k_c);
    }
  
    if (bg<bg_critique){
      insuline=0;
    }
    if (insuline<0){
      insuline=0;
    }
  
    //MainApp.setx2((1-te/ti)*MainApp.getx2() + te/ti*MainApp.getx3() - te*L1*bg);
    x2=(1-te/ti)*x2 + te/ti*x3 - te*L1*bg;
    if (x3==0.0){
      x2=0.0;
    }
  
    x3=(1-te/ti)*x3 + te/ti*u_prec - te*L2*bg;
    if ((u_prec<=insuline_basal)&&(insuline<=insuline_basal)){
      x3=0.0;
    }
  
    u_prec=insuline;

    

    rT.COB=meal_data.mealCOB;
    rT.IOB=iob_data.iob;
    rT.reason="COB: " + meal_data.mealCOB + ", Dev: " + deviation + ", BGI: " + bgi + ", ISF: " + convert_bg(sens, profile) + ", Target: " + convert_bg(target_bg, profile) + "; ";
    if (bg>bg_ref){
      rT.reason += "; setting current basal of " + basal + " as temp";
      return tempBasalFunctions.setTempBasal(insuline, 30, profile, rT, currenttemp);
    }
    if (bg<bg_ref){
      rT.reason += "; setting new_+_ basal of " + basal + " as temp";
      return tempBasalFunctions.setTempBasal(insuline, 30, profile, rT, currenttemp);
    }

    if (eventualBG < min_bg) { // if eventual BG is below target:
        rT.reason += "Eventual BG " + convert_bg(eventualBG, profile) + " < " + convert_bg(min_bg, profile);
        // if 5m or 30m avg BG is rising faster than expected delta
        if (minDelta > expectedDelta && minDelta > 0) {
            if (glucose_status.delta > minDelta) {
                rT.reason += ", but Delta " + tick + " > Exp. Delta " + expectedDelta;
            } else {
                rT.reason += ", but Min. Delta " + minDelta.toFixed(2) + " > Exp. Delta " + expectedDelta;
            }
            if (currenttemp.duration > 15 && (round_basal(basal, profile) === round_basal(currenttemp.rate, profile))) {
                rT.reason += ", temp " + currenttemp.rate + " ~ req " + basal + "U/hr";
                return rT;
            } else {
                rT.reason += "; setting current basal of " + basal + " as temp";
                return tempBasalFunctions.setTempBasal(insuline, 30, profile, rT, currenttemp);
            }
        }


    var minutes_running;
    if (typeof currenttemp.duration == 'undefined' || currenttemp.duration == 0) {
        minutes_running = 30;
    } else if (typeof currenttemp.minutesrunning !== 'undefined'){
        // If the time the current temp is running is not defined, use default request duration of 30 minutes.
        minutes_running = currenttemp.minutesrunning;
    } else {
        minutes_running = 30 - currenttemp.duration;
    }

    // if there is a low-temp running, and eventualBG would be below min_bg without it, let it run
    if (round_basal(currenttemp.rate, profile) < round_basal(basal, profile) ) {
        var lowtempimpact = (currenttemp.rate - basal) * ((30-minutes_running)/60) * sens;
        var adjEventualBG = eventualBG + lowtempimpact;
        if ( adjEventualBG < min_bg ) {
            rT.reason += "letting low temp of " + currenttemp.rate + " run.";
            return rT;
        }
    }
      
    if (currentMinute%5==0){
      return tempBasalFunctions.setTempBasal(0.2, 30, profile, rT, currenttemp);
    }


};

module.exports = determine_basal;
