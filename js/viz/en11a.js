/*globals
jQuery, L, cartodb, geocities, econColors, altColors, Highcharts, science,
regionPromise, countyPromise, cityPromise: true
*/
(function($) {
    /*
    Home prices

    A
    Line graph showing the median home prices for a selected geography. Default
    to region on load with two lines shown (inflation-adjusted and
    non-inflation-adjusted). User can select county or city from dropdown menus
    to get localized data - overlay so both county and region (or city and
    county) are shown on same graph. User can hover over any year to see all
    data points for that year. X-axis should be year, Y-axis should be home
    prices. User should be able to use button bar to switch from Median Home
    Prices to % Growth in Median Home Prices since 1990.


    Y-axis: Median Home Price ($) OR Change in Median House Price since 1990 (%)

    Historical Trend for Home Prices - "Geography" OR
    Historical Trend for Percent Change in Home Prices - "Geography"

    Legends:
    Lines + "Non-Inflation-Adjusted Home Price" and
    "Inflation-Adjusted Home Price" for all geographies

    MISC

    TODO

    REQUESTS

    */

    $(function(){
        var i;
        var countyData, regionData;

        var CHART_BASE_TITLE = 'Historical Trend for Home Prices';
        var CHART_ID = '#en-a-chart';
        var COUNTY_KEY = 'County';
        var YEAR_KEY = 'PopYear';

        var SEA_LEVELS = ['1ft', '2ft', '3ft', '4ft', '5ft', '6ft'].reverse();

        var POPULATION_KEY = 'Pop12';
        var PERCENT_KEY = 'Pop12_Share';
        var POPULATION_KEY_REGION = 'Impacted';
        var PERCENT_KEY_REGION = 'Impacted_Share';

        var DASH_FORMAT = 'ShortDash';

        var selectedGeography = {};
        var years;

        var MODE_POPULATION = {
            title: 'Historical Trend for Vulnerability to Sea Level Rise',
            yAxis: 'Population',
            yMin: 0,
            format: "{value:,.0f}",
            pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
                '<td style="padding:0"><b>{point.y:,.0f} people</b></td></tr>',
            colors: altColors,
            getSeries: function(data, level) {
                var series = {
                    name: level,
                    data: []
                };

                // Get regional data for all years
                _.each(years, function(year) {
                    var regionValue = _.find(regionData, {
                        PopYear: year,
                        Scenario: level
                    })[POPULATION_KEY_REGION];
                    series.data.push(regionValue);
                });

                // If a county is selected, get its value
                if (selectedGeography.county) {
                    console.log("Selected geo", selectedGeography.county, level);
                    var countyValue = _.find(countyData, {
                        County: selectedGeography.county,
                        Scenario: level
                    })[POPULATION_KEY];
                    console.log("Got data", countyValue);
                    series.data.push(countyValue);
                }

                return series;
            }
        };
        var MODE_SHARE = {
            title: 'Historical Trend for Vulnerability to Sea Level Rise',
            yAxis: 'Share of Population',
            format: "{value:,.1f}%",
            pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
                '<td style="padding:0"><b>{point.y:,.1f}%</b></td></tr>',
            colors: altColors,
            getSeries: function(data, level) {
                var series = {
                    name: level,
                    data: []
                };

                // Get regional data
                _.each(years, function(year) {
                    var regionValue = _.find(regionData, {
                        PopYear: year,
                        Scenario: level
                    })[PERCENT_KEY_REGION];
                    series.data.push(regionValue);
                });

                // If a county is selected, get its value
                if (selectedGeography.county) {
                    console.log("Selected geo", selectedGeography.county);
                    var countyValue = _.find(countyData, {
                        County: selectedGeography.county,
                        Scenario: level
                    })[PERCENT_KEY];
                    console.log("Got data", countyValue);
                    series.data.push(countyValue);
                }

                return series;
            }
        };

        var mode = MODE_POPULATION;

        Highcharts.setOptions({
            lang: {
                decimalPoint: '.',
                thousandsSep: ','
            }
        });


        function formatter() {
            if (this.value === 'Bay Area') {
                return '<span style="font-weight:800;color:#000;">' + this.value + '</span>';
            }
            return this.value;
        }


        function getAllSeries() {
            var series = [];

            _.each(SEA_LEVELS, function(level) {
                series = series.concat(mode.getSeries(regionData, level));
            });

            console.log("Got series", series);

            return series.reverse();
        }

        function chart() {
            var series = getAllSeries();

            var tooltip = {
                headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
                pointFormat: mode.pointFormat,
                footerFormat: '</table>',
                shared: true,
                useHTML: true
            };

            var categories = [];

            _.each(years, function(year) {
                categories.push('Bay Area - ' + year);
            });

            var title = mode.title;
            if (selectedGeography.county) {
                categories.push(selectedGeography.county + ' - 2012');
                // title += ' - ' + selectedGeography.county;
            }

            // if (!selectedGeography.city && !selectedGeography.county) {
            //     title += ' - Bay Area';
            // }

            var options = {
                chart: {
                    type: 'column'
                },
                title: {
                    text: title
                },
                xAxis: {
                    categories: categories,
                    tickmarkPlacement: 'on',
                    labels: {
                        maxStaggerLines: 1,
                        staggerLines: 1
                    },
                    title: {
                        enabled: false
                    }
                },
                yAxis: {
                    title: {
                        text: mode.yAxis
                    },
                    labels: {
                        format: mode.format
                    },
                    stackLabels: {
                        enabled: false
                    }
                },
                legend: {
                    enabled: true,
                    reversed: false,
                    symbolWidth: 30,
                    title: {
                        text: 'Sea Level Rise'
                    }
                },
                colors: altColors,
                plotOptions: {
                },
                tooltip: tooltip,
                series: series
            };

            if (_.has(mode, 'yMin')) {
                options.yAxis.min = mode.yMin;
            }

            // Don't explicitly set step size on smaller screens
            if (window.innerWidth < 650) {
                delete options.xAxis.labels;
            }

            $(CHART_ID).highcharts(options);
        }


        function resetCombos(mode) {
            var combo;
            combo = $("#en-a-county-select").data("kendoComboBox");
            combo.text('Select County...');
        }


        function selectLocation(e) {
            selectedGeography = {};
            resetCombos();

            var series = [];
            if (!e) {
                return;
            }

            // Has a county been selected?
            var location = this.dataItem(e.item.index());

            if (location.city === 'Bay Area' || location.County === 'Bay Area') {
                chart();
                return;
            }

            selectedGeography.county = location[COUNTY_KEY];

            chart();
        }


        function setup() {
            chart(CHART_ID);

            $('#population').click(function(){
                $(this).addClass("active");
                $(this).siblings('a').removeClass('active');

                mode = MODE_POPULATION;
                chart();

                $(this).display();
            });
            $('#population-share').click(function(){
                $(this).addClass("active");
                $(this).siblings('a').removeClass('active');

                mode = MODE_SHARE;
                chart();

                $(this).display();
            });

            $("#en-a-county-select").kendoComboBox({
                text: "Select County...",
                dataTextField: COUNTY_KEY,
                dataValueField: COUNTY_KEY,
                dataSource: [{ 'County': 'Bay Area' }].concat(_.uniq(countyData, COUNTY_KEY)),
                select: selectLocation
            });

            var ecACitySelect = $("#ec-a-city-select").data("kendoComboBox");
            var ecACountySelect = $("#ec-a-county-select").data("kendoComboBox");
        }


        function round(n) {
            if (n === null) {
                return n;
            }

            return Math.round(n/100) * 100;
        }


        function roundThousands(n) {
            if (n === null) {
                return n;
            }

            return Math.round(n/1000) * 1000;
        }


        function percent(n) {
            return n * 100;
        }


        function setupNumbers(d) {
            var i;
            for(i = 0; i < d.length; i++) {
                 d[i][PERCENT_KEY] = percent(d[i][PERCENT_KEY]);
                 d[i][PERCENT_KEY_REGION] = percent(d[i][PERCENT_KEY_REGION]);

                 d[i][POPULATION_KEY] = roundThousands(d[i][POPULATION_KEY]);
                 d[i][POPULATION_KEY_REGION] = roundThousands(d[i][POPULATION_KEY_REGION]);
            }
            return d;
        }


        function renameFields(d) {
            var i;
            // for(i = 0; i < d.length; i++) {
            //      d[i][MEDIAN_KEY] = d[i]['sale_price#median'];
            // }
            return d;
        }


        // Get the data ready to visualize
        function prepData(local, region) {
            countyData = setupNumbers(_.clone(local[0], true));
            regionData = setupNumbers(_.clone(region[0], true));

            years = _.uniq(_.pluck(regionData, YEAR_KEY));

            // Once we have the data, set up the visualizations
            setup();
        }


        // Request all the data
        var localPromise = $.ajax({
            dataType: "json",
            url: "http://vitalsigns-production.elasticbeanstalk.com/en/11/local"
        });
        var regionPromise = $.ajax({
            dataType: "json",
            url: "http://vitalsigns-production.elasticbeanstalk.com/en/11/region"
        });

        $.when(localPromise, regionPromise).done(prepData);
    });
})(jQuery);
