var superagent = require('superagent');
var iso8601 = require('iso8601');

// http://api.usno.navy.mil/rstt/oneday?date=11/12/2016&coords=35.3030433,-106.4350902&tz=-7
exports.handler = function (event, context) {
    console.log(event.queryStringParameters);

    var timezoneUri = "https://j8jqi56gye.execute-api.us-west-2.amazonaws.com/prod/timezone?";
    var geocoderUri = "https://j8jqi56gye.execute-api.us-west-2.amazonaws.com/prod/geo?location=";
    var moonUri = "http://api.usno.navy.mil/rstt/oneday?";

    if (event.queryStringParameters.loc == null) {
        context.fail("No location specified.");
    }

    var location = event.queryStringParameters.loc;
    var lat;
    var lng;
    var address;
    var date = new Date();
    console.log(date);
    var dateStr = (date.getMonth() + 1) + "/" + date.getDate() + "/" + date.getFullYear();
    var iso8601Prefix = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + "T";
    var iso8601Suffix;

    console.log("Asking geocoder for information on " + location);
    superagent.get(geocoderUri + location)
        .end(function (err, res) {
            console.log("Geocoder result: " + JSON.stringify(res.body));
            console.log("Getting timezone information");
            lat = res.body.lat;
            lng = res.body.lng;
            address = res.body.address;
            superagent.get(timezoneUri + "lat=" + lat + "&lng=" + lng)
                .end(function (err, res) {
                    var timezone = res.body;
                    console.log("Timezone: " + timezone);
                    console.log("latLng: " + lat + " " + lng);
                    iso8601Suffix = ":00" + timezone;
                    moonUri += "date=" + dateStr + "&coords=" + lat + "," + lng + "&tz=" + timezone;
                    console.log(moonUri);
                    superagent.get(moonUri)
                        .end(function (err, res) {
                            console.log(res.body);
                            //  Begin remapping of response object.
                            // var d = Date.parse(res.body.month + '/' + res.body.day + '/' + res.body.year + ' ' + res.body.sundata[0].time);
                            // console.log(iso8601.fromDate(d));

                            var response = {
                                year: res.body.year,
                                month: res.body.month,
                                day: res.body.day,
                                dayOfWeek: res.body.dayofweek,
                                lng: res.body.lon,
                                lat: res.body.lat,
                                location: location,
                                address: address,
                                tz: res.body.tz,
                                sundata: {
                                    civilRise: iso8601Prefix + res.body.sundata[0].time + iso8601Suffix,
                                    rise: iso8601Prefix + res.body.sundata[1].time + iso8601Suffix,
                                    transit: iso8601Prefix + res.body.sundata[2].time + iso8601Suffix,
                                    set: iso8601Prefix + res.body.sundata[3].time + iso8601Suffix,
                                    civilSet: iso8601Prefix + res.body.sundata[4].time + iso8601Suffix
                                },
                                moondata: {
                                    fracillum: res.body.fracillum ? res.body.fracillum : '50%',
                                    curphase: res.body.curphase ? res.body.curphase : res.body.closestphase.phase
                                }
                            };

                            res.body.moondata.forEach(function(moondatum) {
                                switch(moondatum.phen) {
                                    case "R":
                                        response.moondata.rise = iso8601Prefix + moondatum.time + iso8601Suffix;
                                        break;
                                    case "U":
                                        response.moondata.transit = iso8601Prefix + moondatum.time + iso8601Suffix;
                                        break;
                                    case "S":
                                        response.moondata.set = iso8601Prefix + moondatum.time + iso8601Suffix;
                                        break;
                                }
                            });
                            context.succeed({
                                statusCode: 200,
                                headers: {},
                                body: JSON.stringify(response)
                            });
                        });
                });
        });
};
