var ChartThemes = {};
ChartThemes.white = '#ffffff';
ChartThemes.purple = '#853a6f';
ChartThemes.blue = '#79acbb';
ChartThemes.orange = '#d9791c';
ChartThemes.grayPurple = '#725b7a';
ChartThemes.darkBlue = '#3a688c';
ChartThemes.mediumBlue = '#4e899d';
ChartThemes.green = '#67a470';
ChartThemes.lightPurple = '#8b67a4';
ChartThemes.pink = '#e37373';
ChartThemes.ligherPurple = '#a879bb';
ChartThemes.yellow = '#ebd177';
ChartThemes.defaultTheme = function() {
    return {
        colors : [
        '#ffffff'
        ,'#853a6f'
        ,'#79acbb'
        ,'#d9791c'
        ,'#725b7a'
        ,'#3a688c'
        ,'#4e899d'
        ,'#67a470'
        ,'#8b67a4'
        ,'#e37373'
        ,'#a879bb'
        ,'#ebd177'
        ],
        chart: {
            backgroundColor: 'rgba(255,255,255,0)',
            borderColor: '#000000',
            borderWidth: 0,
            plotBackgroundColor: 'rgba(255, 255, 255, 0)',
            plotBorderColor: '#CCCCCC',
            plotBorderWidth: 0
        },
        exporting: {enabled: false},
        title: {
            style: {
                color: '#C0C0C0',
                // font: 'bold 16px "Trebuchet MS", Verdana, sans-serif'
                    fontWeight: 'bold',
                    fontSize: '16px',
                    fontFamily: 'AvenirNext'
            }
        },
        subtitle: {
            style: {
                color: '#666666',
                // font: 'bold 12px "Trebuchet MS", Verdana, sans-serif'
                    fontWeight: 'bold',
                    fontSize: '16px',
                    fontFamily: 'AvenirNext'
            }
        },
        xAxis: {
            gridLineColor: '#0000ff',
            gridLineWidth: 0,
            labels: {
                enabled: false
            },
            lineColor: '#A0A0A0',
            lineWidth:0,
            tickColor: '#A0A0A0',
            tickWidth:0,
            title: {
                style: {
                    color: '#CCC',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    fontFamily: 'AvenirNext'

                }
            }
        },
        yAxis: {
            gridLineColor: '#333333',
            gridLineWidth:0,
            labels: {
                style: {
                    color: '#A0A0A0'
                }
                ,enabled: false
            },
            lineColor: '#A0A0A0',
            lineWidth:0,
            minorTickInterval: null,
            tickColor: '#A0A0A0',
            tickWidth: 0,
            title: {
                enabled: false,
                style: {
                    color: '#CCC',
                    fontWeight: 'bold',
                    fontSize: '4em',
                    // fontFamily: 'Trebuchet MS, Verdana, sans-serif'
                    fontFamily: 'AvenirNext'
                }
            }
        },
        tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            borderWidth:0,
            style: {
                color: '#F0F0F0'
            }
        },
        toolbar: {
            itemStyle: {
                color: 'silver'
            }
        },
        plotOptions: {
            line: {
                dataLabels: {
                    color: '#CCC'
                },
                marker: {
                    lineColor: '#333'
                }
            },
            spline: {
                marker: {
                    lineColor: '#333'
                }
            },
            scatter: {
                marker: {
                    lineColor: '#333'
                }
            },
            candlestick: {
                lineColor: 'white'
            }
        },
        legend: {
            useHTML: true,
            itemStyle: {
                fontFamily: 'AvenirNext',
                fontSize:'14px',
                fontWeight:'inherit',
                color:'inherit',
            },
            itemHoverStyle: {
                color: '#FFF'
            },
            itemHiddenStyle:  {
                color: '#444'
            },
            borderWidth: 0
        },
        credits: {
            style: {
                color: '#666'
            }
        },
        labels: {
            style: {
                color: '#CCC'
            }
        },

        credits: {enabled: false},
        navigation: {
            buttonOptions: {
                symbolStroke: '#DDDDDD',
                hoverSymbolStroke: '#FFFFFF',
                theme: {
                    fill: {
                        linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                        stops: [
                        [0.4, '#606060'],
                        [0.6, '#333333']
                        ]
                    },
                    stroke: '#000000'
                }
            }
        }

        ,rangeSelector: {
            buttonTheme: {
                fill: {
                    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                    stops: [
                    [0.4, '#888'],
                    [0.6, '#555']
                    ]
                },
                stroke: '#000000',
                style: {
                    color: '#CCC',
                    fontWeight: 'bold'
                },
                states: {
                    hover: {
                        fill: {
                            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                            stops: [
                            [0.4, '#BBB'],
                            [0.6, '#888']
                            ]
                        },
                        stroke: '#000000',
                        style: {
                            color: 'white'
                        }
                    },
                    select: {
                        fill: {
                            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                            stops: [
                            [0.1, '#000'],
                            [0.3, '#333']
                            ]
                        },
                        stroke: '#000000',
                        style: {
                            color: 'yellow'
                        }
                    }
                }
            },
            inputStyle: {
                backgroundColor: '#333',
                color: 'silver'
            },
            labelStyle: {
                color: 'silver'
            }
        },

        navigator: {
            handles: {
                backgroundColor: '#666',
                borderColor: '#AAA'
            },
            outlineColor: '#CCC',
            maskFill: 'rgba(16, 16, 16, 0.5)',
            series: {
                color: '#7798BF',
                lineColor: '#A6C7ED'
            }
        },

        scrollbar: {
            barBackgroundColor: {
                linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                stops: [
                [0.4, '#888'],
                [0.6, '#555']
                ]
            },
            barBorderColor: '#CCC',
            buttonArrowColor: '#CCC',
            buttonBackgroundColor: {
                linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                stops: [
                [0.4, '#888'],
                [0.6, '#555']
                ]
            },
            buttonBorderColor: '#CCC',
            rifleColor: '#FFF',
            trackBackgroundColor: {
                linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                stops: [
                [0, '#000'],
                [1, '#333']
                ]
            },
            trackBorderColor: '#666'
        }

        // special colors for some of the
        ,legendBackgroundColor: 'rgba(0, 0, 0, 0.5)',
        legendBackgroundColorSolid: 'rgb(35, 35, 70)',
        dataLabelsColor: '#444',
        textColor: '#C0C0C0',
        maskColor: 'rgba(255,255,255,0.3)'
    };
}
