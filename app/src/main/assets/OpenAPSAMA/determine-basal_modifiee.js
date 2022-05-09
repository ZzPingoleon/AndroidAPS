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
    
  
    var basaliob;
    if (iob_data.basaliob) { basaliob = iob_data.basaliob; }
    else { basaliob = iob_data.iob - iob_data.bolussnooze; }
    
    //données liées au patient :
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
  
    var dia_0=profile.dia;
    
  
    if (typeof profile.target_bg !== 'undefined') {
        target_bg = profile.target_bg;
    } else {
      target_bg = (profile.min_bg + profile.max_bg) / 2;// La cible est définie comme la moyenne entre le max et le min donné par l'utilisateur
        } 

    //observateur d'état:
    var L1=profile.L1;
    var L2=profile.L2;
    var te=5;

    var debit_basal=k_d/k_i;
    var insuline_basal=debit_basal;
 
    var x1_before=debit_basal;
    
    const fs=require('fs')
    let rawdata=fs.readFileSync('app/src/main/assets/variables_globales.json')
    let x2_x3_global=JSON.parse(rawdata)
    
    if (bg>bg_ref){
      insuline_basal+=(bg-bg_ref)/k_i
    }
    
    var bg_before=glucose_status.glucose_before;
    if (typeof bg_before !=='undefined'){
      if (bg_before>bg_ref){
        x1_before+=(bg_before-bg_ref)/k_i
      }
    }
    else{
      bg_before=bg-glucose_status.delta
      if (bg_before>bg_ref){
        x1_before+=(bg_before-bg_ref)/k_i
      }
    }
  
  
    var x2_now=0
    var x3_now=0;
  
    if (x2_x3_global.length>0){
      
      var x2_before=x2_x3_global[x2_x3_global.length-1].x2;
      var x3_before=x2_x3_global[x2_x3_global.length-1].x3;
      var ud_before=currenttemp.rate;
      
      x2_now=(1-te/ti)*x2_before + te/ti*x3_before - te*L1*x1_before
      x3_now=(1-te/ti)*x3_before + te/ti*ud_before - te*L2*x1_before
      
      insuline_basal=insuline_basal-ti*(x2_now+x3_now)
    }
    x2_x3_global.push({x2: x2_now, x3: x3_now})
    let data=JSON.stringify(x2_x3_global);
    fs.writeFileSync('app/src/main/assets/variables_globales.json',data);
  
    if (meal_data.carbs>0){
      var insuline=insuline_basal+meal_data.carbs/(k_i/k_c)
      meal_data.carbs=0;
      return tempBasalFunctions.setTempBasal(insuline, 30, profile, rT, currenttemp);
    }
  
    if (bg<bg_critique){
      insuline_basal=0;
    }
  
    if (insuline_basal<0){
      insuline_basal=0;
    }
  
    return tempBasalFunctions.setTempBasal(insuline_basal, 30, profile, rT, currenttemp);
    

};

module.exports = determine_basal;
