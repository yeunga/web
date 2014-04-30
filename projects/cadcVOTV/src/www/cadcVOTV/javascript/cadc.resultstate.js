(function($)
{
    $.extend(true, window, {
        "cadc": {
            "web": {
                "ResultState": ResultState,
                "START_OF_PARAMETERS": "SOP",
                "END_OF_PARAMETERS": "EOP",
                "COLUMN_PARAMETER_NAME": "col_",
                "SORT_COLUMN": "sortCol",
                "SORT_DIRECTION": "sortDir",
                "SORT_ASCENDING": "asc",
                "SORT_DESCENDING": "dsc"
            }
        }
    });


    /**
     * A library to serialize and deserialize a query and the state of the
     * results table.
     *
     */
    function ResultState()
    {

        /**
         * Returns a url from the given arguments that contains the query parameters
         * and optionally parameters that describe the state of the results table.
         * 
         * @param {String} _baseUrl The base url.
         * @param {String} _queryUrl The query url.
         * @param {String} _sortColumn Column the table is sorted on.
         * @param {String} _sortDirection Sort direction, ascending or descending.
         * @param {array} _columns Columns that are actually in the Grid.
         * @param {Object} _widths Column id's and widths.
         * @param {Object} _filters Column id's and filter values.
         * @param {Object} _units Column id's and select values.
         */
        function getResultStateUrl(_baseUrl, _queryUrl, _sortColumn, 
                                   _sortDirection, _columns, _widths,
                                   _filters, _units)
        {
            var baseUrl = _baseUrl;
            var queryUrl = _queryUrl;
            var sortColumn = _sortColumn;
            var sortDirection = _sortDirection;
            var columns = _columns || [];
            var widths = _widths || {};
            var filters = _filters || {};
            var units = _units || {};

            var url = [];
            url.push(baseUrl);
            url.push(queryUrl);
            url.push("&");
            url.push(cadc.web.START_OF_PARAMETERS);
            if (sortColumn)
            {
                url.push("&");
                url.push(cadc.web.SORT_COLUMN);
                url.push("=");
                url.push(encodeURIComponent(sortColumn));
            }
            if (sortDirection)
            {
                url.push("&");
                url.push(cadc.web.SORT_DIRECTION);
                url.push("=");
                if (sortDirection === cadc.web.SORT_ASCENDING)
                {
                    url.push(cadc.web.SORT_ASCENDING);
                }
                else
                {
                    url.push(cadc.web.SORT_DESCENDING);
                }
            }
            $.each(columns, function(index, column)
            {
                url.push(getColumnParameter(index + 1, column, widths, filters, units));
            });
            url.push("&");
            url.push(cadc.web.END_OF_PARAMETERS);
            return url.join("");
        };

        /**
         * Returns an url parameter from the given column attributes.
         * 
         * @param {type} _index
         * @param {type} _column
         * @param {Object} _widths Column id's and widths.
         * @param {Object} _filters Column id's and filter values.
         * @param {Object} _units Column id's and select values.
         * @returns {String}
         */
        function getColumnParameter(_index, _column, _widths, _filters, _units)
        {
            var parameter = [];
            parameter.push("&");
            parameter.push(cadc.web.COLUMN_PARAMETER_NAME);
            parameter.push(_index);
            parameter.push("=");
            parameter.push(encodeURIComponent(_column));
            parameter.push(";");
            parameter.push(_widths[_column] ? encodeURIComponent(_widths[_column]) : "");
            parameter.push(";");
            parameter.push(_filters[_column] ? encodeURIComponent(_filters[_column]) : "");
            parameter.push(";");
            parameter.push(_units[_column] ? _units[_column] : "");
            return parameter.join("");
        };

        /**
         * Parses the query url into just the query url part, removing any
         * result state parameters.
         * 
         * @param {String} url The query url.
         * @returns {String}
         */
        function parseQueryUrl(url)
        {
            // Look for the cadc.web.START_OF_PARAMETERS parameter.
            var parts = url.split("&" + cadc.web.START_OF_PARAMETERS);
            return parts[0] ? parts[0] : "";
        };

        /**
         * Parse the result table state parameters into an object containing
         * the sort column name and sort column direction (ascending/descending)
         * and the columnID, width, filter, and unit for each column.
         * 
         * @param {String} url The query url.
         * @returns {Object}
         */
        function getResultState(url)
        {
            var resultState = {};
            
            // check for result state start parameter.
            var startIndex = url.indexOf("&" + cadc.web.START_OF_PARAMETERS);
            if (startIndex === -1)
            {
                resultState["error"] = "Start of parameters parameters not found";
                return resultState;
            }
            
            // check for result state end parameter to verify the parameters
            // haven't been truncated.
            var endIndex = url.indexOf("&" + cadc.web.END_OF_PARAMETERS);
            if (endIndex === -1)
            {
                resultState["error"] = "End of parameters parameters not found";
                return resultState;
            }
            
            var columns = [];
            var parameters = url.substring(startIndex + cadc.web.START_OF_PARAMETERS.length + 1, endIndex).split("&");
            $.each(parameters, function(index, parameter)
            {
                var nameValue = parameter.split("=");
                if (nameValue.length === 2)
                {
                    if (nameValue[0] === cadc.web.SORT_COLUMN)
                    {
                        resultState[cadc.web.SORT_COLUMN] = nameValue[1];
                    }
                    else if (nameValue[0] === cadc.web.SORT_DIRECTION)
                    {
                        resultState[cadc.web.SORT_DIRECTION] = nameValue[1];
                    }
                    else if (nameValue[0].slice(0, cadc.web.COLUMN_PARAMETER_NAME.length) === cadc.web.COLUMN_PARAMETER_NAME)
                    {
                        var columnNumber = nameValue[0].substring(cadc.web.COLUMN_PARAMETER_NAME.length);
                        var parts = nameValue[1].split(";");
                        var state = {};
                        state["number"] = columnNumber;
                        state["id"] = parts[0] ? decodeURIComponent(parts[0]) : '';
                        state["width"] = parts[1] ? parts[1] : '';
                        state["filter"] = parts[2] ? decodeURIComponent(parts[2]) : '';
                        state["unit"] = parts[3] ? decodeURIComponent(parts[3]) : '';
                        columns.push(state);
                    }
                    else
                    {
                        console.error("Unknown parameter: " + nameValue[0]);
                    }
                }
            });
            
            // Sort the columns by column number.
            columns.sort(compare);
            resultState["columns"] = columns;
            
            // Create an array of column id's.
            var displayColumns = [];
            $.each(columns, function(index, column) 
            {
               displayColumns.push(column.id); 
            });
            resultState["displayColumns"] = displayColumns;
            
            return resultState;
        };
        
        /**
         * Sort the array by the number attribute.
         * 
         * @param {Object} a
         * @param {Object} b
         * @returns {Number}
         */
        function compare(a, b)
        {
            if (a.number < b.number)
            {
               return -1;
            }
            if (a.number > b.number)
            {
                return 1;
            }
            return 0;
        };

        $.extend(this,
                {
                    // Methods
                    "getResultStateUrl": getResultStateUrl,
                    "getResultState": getResultState,
                    "parseQueryUrl": parseQueryUrl
                });
    }
})(jQuery);
