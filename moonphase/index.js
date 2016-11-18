var superagent = require('superagent');

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
    var date = new Date();
    console.log(date);
    var dateStr = (date.getMonth() + 1) + "/" + date.getDate() + "/" + date.getFullYear();

    console.log("Asking geocoder for information on " + location);
    superagent.get(geocoderUri + location)
        .end(function (err, res) {
            console.log("Geocoder result: " + JSON.stringify(res.body));
            console.log("Getting timezone information");
            lat = res.body.lat;
            lng = res.body.lng;
            superagent.get(timezoneUri + "lat=" + lat + "&lng=" + lng)
                .end(function (err, res) {
                    console.log("Timezone: " + res.body);
                    console.log("latLng: " + lat + " " + lng);
                    superagent.get(moonUri + "date=" + dateStr + "&coords=" + lat + "," + lng + "&tz=" + res.body)
                        .end(function (err, res) {
                            console.log(res.body);
                            var response = {
                                year: res.body.year,
                                month: res.body.month,
                                day: res.body.day,
                                dayOfWeek: res.body.dayofweek,
                                lng: res.body.lon,
                                lat: res.body.lat,
                                tz: res.body.tz,
                                sundata: {
                                    civilRise: res.body.sundata[0].time,
                                    rise: res.body.sundata[1].time,
                                    transit: res.body.sundata[2].time,
                                    set: res.body.sundata[3].time,
                                    civilSet: res.body.sundata[4].time
                                },
                                moondata: {}
                            };

                            res.body.moondata.forEach(function(moondatum) {
                                switch(moondatum.phen) {
                                    case "R":
                                        response.moondata.rise = moondatum.time;
                                        break;
                                    case "U":
                                        response.moondata.transit = moondatum.time;
                                        break;
                                    case "S":
                                        response.moondata.set = moondatum.time;
                                        break;
                                };
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
