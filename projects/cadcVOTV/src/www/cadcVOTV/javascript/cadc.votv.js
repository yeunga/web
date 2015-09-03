(function ($)
{
  // register namespace
  $.extend(true, window, {
    "cadc": {
      "vot": {
        "Viewer": Viewer,
        "CHECKBOX_SELECTOR_COLUMN_ID": "_checkbox_selector",
        "ROW_SELECT_DISABLED_KEY": "_ROW_SELECT_DISABLED_",
        "datatype": {
          "NUMERIC": "NUMERIC",
          "STRING": "STRING",
          "DATETIME": "DATETIME"
        },
        "DEFAULT_CELL_PADDING_PX": 8,
        "events": {
          "onSort": new jQuery.Event("cadcVOTV:onSort"),
          "onColumnOrderReset": new jQuery.Event("cadcVOTV:onColumnOrderReset"),
          "onRowsChanged": new jQuery.Event("cadcVOTV:onRowsChanged"),
          "onDataLoaded": new jQuery.Event("cadcVOTV:onDataLoaded"),
          "onUnitChanged": new jQuery.Event("cadcVOTV:onUnitChanged")
        }
      }
    }
  });

  /**
   * Create a VOView object.  This is here to package everything together.
   *
   * @param targetNodeSelector  The target node selector to place the this.
   * @param options             The options object.
   * editable: true/false,
   * enableAddRow: true/false,
   * showHeaderRow: true/false,
   * enableCellNavigation: true/false,
   * asyncEditorLoading: true/false,
   * forceFitColumns: true/false,
   * explicitInitialization: true/false,
   * topPanelHeight: Number,
   * headerRowHeight: Number,
   * showTopPanel: true,
   * sortColumn: Start Date
   * sortDir: asc/desc
   * @constructor
   */
  function Viewer(targetNodeSelector, options)
  {
    var _self = this;
    var $_lengthFinder =
      $("#lengthFinder")
      || $("<div id='lengthFinder'></div>").appendTo($(document.body));
    this.grid = null;
    this.columnManager = options.columnManager ? options.columnManager : {};
    this.rowManager = options.rowManager ? options.rowManager : {};

    this.$emptyResultsMessage =
      $(options.emptyResultsMessageSelector)
      ||
      $("<div class=\"cadcvotv-empty-results-message\">No results returned.</div>")
        .appendTo($(".grid-container"));

    this.columns = [];
    // displayColumns: columns that are actually in the Grid.
    this.displayColumns = options.displayColumns ? options.displayColumns : [];
    this.resizedColumns = {};  // Columns the user has resized.
    this.columnFilters = options.columnFilters ? options.columnFilters : {};
    this.columnFilterPluginName = options.columnFilterPluginName || "default";
    this.updatedColumnSelects = {};
    this.targetNodeSelector = targetNodeSelector;
    this.columnOptions = options.columnOptions ? options.columnOptions : {};
    this.options = options;
    this.options.forceFitColumns = options.columnManager
      ? options.columnManager.forceFitColumns
      : false;

    // This is the TableData for a VOTable.  Will be set on load.
    this.longestValues = {};

    this.sortcol = options.sortColumn;
    this.sortAsc = options.sortDir == "asc";

    // story 1584 - variable viewport height
    this.variableViewportHeight = options.variableViewportHeight
      ? options.variableViewportHeight
      : false;
    this.viewportOffset = 0;

    this.rowCountMessage = options.rowCountMessage ? options.rowCountMessage :
                           defaultRowCountMessage;

    this.atDataLoadComplete = options.atDataLoadComplete
        ? options.atDataLoadComplete : defaultDataLoadComplete;
    this.atPageInfoChanged = options.atPageInfoChanged
        ? options.atPageInfoChanged : defaultPageChanging;

    /**
     * @param input  Object representing the input.
     *
     * One of xmlDOM or json or url is required.
     *
     * input.xmlDOM = The XML DOM Object
     * input.json = The JSON Object
     * input.csv = The CSV text
     * input.url = The URL of the input.  The Content-Type will dictate how to
     *             build it.  This is the only way to stream CSV.
     * @param completeCallback  Callback function when complete.
     * @param errorCallBack     Callback function with jqXHR, status, message
     *                    (Conforms to jQuery error callback for $.ajax calls).
     */
    function build(input, completeCallback, errorCallBack)
    {
      // Keep the empty results stuff hidden.
      $(getTargetNodeSelector()).removeClass("cadcvotv-empty-results-overlay");
      _self.$emptyResultsMessage.hide();

      new cadc.vot.Builder(getOptions().maxRowLimit,
                           input,
                           function (voTableBuilder)
                           {
                             voTableBuilder.subscribe(cadc.vot.onDataLoadComplete,
                                                      function (event, args)
                                                      {
                                                        if (args)
                                                        {
                                                          setLongestValues(args.longestValues);
                                                        }

                                                        if (input.xmlDOM)
                                                        {
                                                          var voTable =
                                                            args.builder.getVOTable();

                                                          if (!hasDisplayColumns)
                                                          {
                                                            refreshColumns(
                                                              voTable.getMetadata().getFields());
                                                          }

                                                          // Setup the Grid and DataView to be loaded.
                                                          _self.init();

                                                          load(args.builder.getVOTable(),
                                                               false, true);
                                                        }

                                                        resetColumnWidths();

                                                        // Display spinner only
                                                        // if paging is off
                                                        if (!usePager())
                                                        {
                                                          _self.atDataLoadComplete(getTotalRows(), getCurrentRows(), getHeaderLabel());
                                                        }

                                                        var $gridHeaderIcon =
                                                          getHeader().find("img.grid-header-icon");

                                                        // clear the wait icon
                                                        $gridHeaderIcon.attr("src", "/cadcVOTV/images/transparent-20.png");

                                                        if (getRows().length === 0)
                                                        {
                                                          $(getTargetNodeSelector()).addClass("cadcvotv-empty-results-overlay");
                                                          _self.$emptyResultsMessage.show();
                                                        }

                                                        trigger(cadc.vot.events.onDataLoaded,
                                                                args);
                                                      });

                             var hasDisplayColumns =
                               (_self.displayColumns
                                && (_self.displayColumns.length > 0));

                             // Set up to stream.
                             if (input.url || input.csv)
                             {
                               var inputFields =
                                 input.tableMetadata.getFields();
                               var $resultsGridHeader = getHeader();
                               var $gridHeaderIcon =
                                 getHeader().find("img.grid-header-icon");

                               // Display spinner only if paging is off
                               if (!usePager())
                               {
                                 var $gridHeaderStyle =
                                   $resultsGridHeader.prop("style");

                                 // remove any background color resulting from
                                 // previous warning message
                                 if ($gridHeaderStyle)
                                 {
                                   $gridHeaderStyle.backgroundColor = "";
                                 }

                                 // add a spinner to the header bar to indicate
                                 // streaming has begun
                                 if ($gridHeaderIcon)
                                 {
                                   $gridHeaderIcon.attr("src", "/cadcVOTV/images/PleaseWait-small.gif");
                                 }
                               }

                               /*
                                * We need to refresh columns twice; once to
                                * display something while the data is streaming,
                                * and again to update the column widths based
                                * on data.
                                *
                                * jenkinsd 2013.12.20
                                */
                               if (!hasDisplayColumns)
                               {
                                 refreshColumns(inputFields);
                               }

                               // Setup the Grid and DataView to be loaded.
                               _self.init();

                               voTableBuilder.subscribe(cadc.vot.onPageAddStart,
                                                        function ()
                                                        {
                                                          getDataView().beginUpdate();

                                                          // Notify that data is loading.
                                                          _self.atPageInfoChanged(
                                                            getTotalRows(),
                                                            getCurrentRows(),
                                                            getHeaderLabel());
                                                        });

                               voTableBuilder.subscribe(cadc.vot.onPageAddEnd,
                                                        function ()
                                                        {
                                                          getDataView().endUpdate();

                                                          // Sorting as data
                                                          // loads.  Not sure
                                                          // if this is a good
                                                          // idea or not.
                                                          // jenkinsd
                                                          // 2014.05.09 WebRT
                                                          // 53730
                                                          sort();
                                                        });

                               voTableBuilder.subscribe(cadc.vot.onRowAdd,
                                                        function (event, row)
                                                        {
                                                          addRow(row, null);
                                                        });
                             }

                             voTableBuilder.build(
                               voTableBuilder.buildRowData);

                             if (completeCallback)
                             {
                               completeCallback(voTableBuilder);
                             }
                           }, errorCallBack);
    }

    function defaultRowCountMessage(totalRows, rowCount)
    {
      return "Showing " + totalRows + " rows (" + rowCount
             + " before filtering).";
    }

    function getRowCountMessage(totalRows, rowCount)
    {
      return _self.rowCountMessage(totalRows, rowCount);
    }

    function getTargetNodeSelector()
    {
      return _self.targetNodeSelector;
    }

    function getPagerNodeSelector()
    {
      return "#pager";
    }

    function getHeaderNodeSelector()
    {
      return "div.grid-header";
    }

    function getHeader()
    {
      return $(getTargetNodeSelector()).prev();
    }

    function getHeaderLabel()
    {
      return getHeader().find(".grid-header-label");
    }

    function getColumnManager()
    {
      return _self.columnManager;
    }

    function getRowManager()
    {
      return _self.rowManager;
    }

    function getColumns()
    {
      return _self.columns;
    }

    function getColumnOptions()
    {
      return _self.columnOptions;
    }

    function getOptionsForColumn(columnLabel)
    {
      return getColumnOptions()[columnLabel]
        ? getColumnOptions()[columnLabel] : {};
    }

    function getResizedColumns()
    {
      return _self.resizedColumns;
    }

    function getUpdatedColumnSelects()
    {
      return _self.updatedColumnSelects;
    }

    function isFilterable(column)
    {
      var globallyFilterable = getColumnManager().filterable || false;
      var columnFilterable = column.filterable || globallyFilterable;

      return (columnFilterable === true);
    }

    /**
     * Obtain whether the global fitMax or per column fitMax option has been
     * set.
     *
     * @param columnID    The column ID to check.
     */
    function isFitMax(columnID)
    {
      var columnOptions = getOptionsForColumn(columnID);
      var fitMaxEnabled = (getOptions().fitMax === true);

      if (columnOptions)
      {
        if (columnOptions.fitMax === true)
        {
          fitMaxEnabled = true;
        }
        else if (columnOptions.fitMax === false)
        {
          fitMaxEnabled = false;
        }
      }

      return fitMaxEnabled;
    }

    function getColumnFilters()
    {
      return _self.columnFilters;
    }

    function setColumnFilter(columnID, filterValue)
    {
      $(getTargetNodeSelector()).find("input[id='" + columnID
                                      + "_filter']").val(filterValue);
    }

    function columnFiltersEmpty()
    {
      for (var cf in _self.columnFilters)
      {
        var nextFilter = _self.columnFilters[cf];

        if (nextFilter && $.trim(nextFilter))
        {
          return false;
        }
      }

      return true;
    }

    function getColumnFilterPluginName()
    {
      return _self.columnFilterPluginName;
    }

    function clearColumnFilters()
    {
      _self.columnFilters = {};
    }

    /**
     * Obtain a column from the Grid by its unique ID.
     * @param columnID    The Column ID.
     * @returns {Object} column definition.
     */
    function getGridColumn(columnID)
    {
      var existingColumnIndex = getGrid().getColumnIndex(columnID);

      var col;

      if (!isNaN(existingColumnIndex))
      {
        col = getGrid().getColumns()[existingColumnIndex];
      }
      else
      {
        col = null;
      }

      return col;
    }

    /**
     * Obtain the index of the given column ID.  Return the index, or -1 if it
     * does not exist.
     *
     * @param columnID
     * @returns {number}
     */
    function getColumnIndex(columnID)
    {
      var allCols = getColumns();

      for (var i = 0; i < allCols.length; i++)
      {
        var nextCol = allCols[i];

        if (nextCol.id == columnID)
        {
          return i;
        }
      }

      return -1;
    }

    /**
     * Obtain a column from the CADC VOTV column cache by its unique ID.
     * @param columnID    The Column ID.
     * @returns {Object} column definition.
     */
    function getColumn(columnID)
    {
      var columnIndex = getColumnIndex(columnID);

      var col;

      if (columnIndex || (columnIndex === Number(0)))
      {
        col = getColumns()[columnIndex];
      }
      else
      {
        col = null;
      }

      return col;
    }

    function addColumn(columnObject)
    {
      _self.columns.push(columnObject);
    }

    function setColumns(cols)
    {
      _self.columns = cols.slice(0);
    }

    function clearColumns()
    {
      _self.columns.length = 0;
    }

    /**
     * Add a VOTable Row.
     *
     * @param row       The cadc.vot.Row object.
     * @param rowIndex  The optional row index.
     */
    function addRow(row, rowIndex)
    {
      var cellArray = row.getCells();
      var dataRow = {};

      dataRow["id"] = row.getID();
      for (var ci = 0, cl = cellArray.length; ci < cl; ci++)
      {
        var cell = cellArray[ci];
        var cellFieldID = cell.getField().getID();
        dataRow[cellFieldID] = cell.getValue();
      }

      if (getRowManager().isRowDisabled)
      {
        dataRow[cadc.vot.ROW_SELECT_DISABLED_KEY] =
          getRowManager().isRowDisabled(row);
      }

      if (rowIndex)
      {
        getDataView().getItems()[rowIndex] = dataRow;
      }
      else
      {
        getDataView().getItems().push(dataRow);
      }
    }

    function clearRows()
    {
      var data = getDataView();
      data.beginUpdate();
      data.getItems().length = 0;
      data.endUpdate();
    }

    function getDataView()
    {
      return getGrid().getData();
    }

    function setGrid(gridObject)
    {
      _self.grid = gridObject;
    }

    function getSelectedRows()
    {
      return getGrid().getSelectedRows();
    }

    function getRow(_index)
    {
      return getDataView().getItem(_index);
    }

    function getRows()
    {
      return getDataView().getItems();
    }

    function getGrid()
    {
      return _self.grid;
    }

    function refreshGrid()
    {
      var g = getGrid();
      g.updateRowCount();
      g.invalidateAllRows();
      g.resizeCanvas();
    }

    function getGridHeaderHeight()
    {
      return ($(".grid-header").height() +
              $(".slick-header").height() +
              $(".slick-headerrow").height());
    }

    /**
     * Call if supporting a variable viewport height, and there's a static
     * header that not part of the grid container.
     */
    function setViewportOffset(offset)
    {
      _self.viewportOffset = (offset + getGridHeaderHeight());
    }

    function setViewportHeight()
    {
      if (_self.variableViewportHeight)
      {
        $(_self.targetNodeSelector).
          height($(window).height() - _self.viewportOffset);
      }
    }


    /**
     * Tell the Grid to sort.  This exists mainly to set an initial sort column
     * on the Grid.
     */
    function sort()
    {
      if (_self.sortcol)
      {
        var isAscending = (_self.sortAsc || (_self.sortAsc == 1));
        getGrid().setSortColumn(_self.sortcol, isAscending);

        trigger(cadc.vot.events.onSort, {
          sortCol: _self.sortcol,
          sortAsc: isAscending
        });
      }
    }

    /**
     * Set the sort column.  Here mainly for testing.
     *
     * @param _sortColumn   The column ID to use.
     */
    function setSortColumn(_sortColumn)
    {
      _self.sortcol = _sortColumn;
    }

    function getOptions()
    {
      return _self.options;
    }

    function setOptions(_optionsDef)
    {
      _self.options = _optionsDef;
    }

    function usePager()
    {
      return getOptions() && getOptions().pager;
    }

    function getLongestValues()
    {
      return _self.longestValues;
    }

    function getLongestValue(_columnID)
    {
      return getLongestValues()[_columnID];
    }

    function setLongestValues(_longestValues)
    {
      _self.longestValues = _longestValues;
    }

    /**
     * Get the columns that are to BE displayed.
     * @return {Array}    Array of Column objects.
     */
    function getDisplayColumns()
    {
      if (!_self.displayColumns || (_self.displayColumns.length == 0))
      {
        setDisplayColumns(getDefaultColumns().slice(0));
      }
      return _self.displayColumns;
    }

    /**
     * Get the columns that ARE CURRENTLY displayed.  Useful for saving for
     * future profile usage (i.e. restoring previous session).
     *
     * @return {Array}    Array of Column objects.
     */
    function getDisplayedColumns()
    {
      var cols = [];

      if (getGrid())
      {
        cols = getGrid().getColumns();
      }
      else
      {
        cols = [];
      }

      return cols;
    }

    function setDisplayColumns(dispCols)
    {
      _self.displayColumns = dispCols;
    }

    function getDefaultColumns()
    {
      var cols = [];
      var opts = getOptions();
      var defaultColumnIDs = opts.defaultColumnIDs;
      if (!defaultColumnIDs || (defaultColumnIDs.length == 0))
      {
        cols = getColumns().slice(0);
      }
      else
      {
        for (var i = 0, dcii = defaultColumnIDs.length; i < dcii; i++)
        {
          var nextDefaultColumn = defaultColumnIDs[i];
          if (nextDefaultColumn)
          {
            var thisCols = getColumns();
            for (var j = 0, cj = thisCols.length; j < cj; j++)
            {
              if (thisCols[j].id == nextDefaultColumn)
              {
                cols.push(thisCols[j]);
              }
            }
          }
        }
      }

      return cols;
    }

    /**
     * TODO - There are a lot of return points in this method.  Let's try to
     * TODO - reduce them.
     * TODO - jenkinsd 2014.12.04
     *
     * @param filter             The filter value as entered by the user.
     * @param value              The value to be filtered or not
     * @returns {Boolean} true if value is filtered-out by filter.
     */
    function valueFilters(filter, value)
    {
      var operator = '';
      var exactMatch = false;
      filter = $.trim(filter);

      // determine the operator and filter value
      if (filter.indexOf('= ') == 0)
      {
        exactMatch = true;
        filter = filter.substring(2);
      }
      else if (filter.indexOf('=') == 0)
      {
        exactMatch = true;
        filter = filter.substring(1);
      }
      else if (filter.indexOf('>= ') == 0)
      {
        filter = filter.substring(3);
        operator = 'ge';
      }
      else if (filter.indexOf('>=') == 0)
      {
        filter = filter.substring(2);
        operator = 'ge';
      }
      else if (filter.indexOf('<= ') == 0)
      {
        filter = filter.substring(3);
        operator = 'le';
      }
      else if (filter.indexOf('<=') == 0)
      {
        filter = filter.substring(2);
        operator = 'le';
      }
      else if (filter.indexOf('> ') == 0)
      {
        filter = filter.substring(2);
        operator = 'gt';
      }
      else if (filter.indexOf('>') == 0)
      {
        filter = filter.substring(1);
        operator = 'gt';
      }
      else if (filter.indexOf('< ') == 0)
      {
        filter = filter.substring(2);
        operator = 'lt';
      }
      else if (filter.indexOf('<') == 0)
      {
        filter = filter.substring(1);
        operator = 'lt';
      }
      else if (filter.indexOf('..') > 0)
      {
        // filter on the range and return
        var dotIndex = filter.indexOf('..');
        var left = filter.substring(0, dotIndex);
        if ((dotIndex) + 2 < filter.length)
        {
          var right = filter.substring(dotIndex + 2);

          if (areNumbers(value, left, right))
          {
            return ((parseFloat(value) < parseFloat(left))
                    || (parseFloat(value) > parseFloat(right)));
          }
          else
          {
            return ((value < left) || (value > right));
          }
        }
      }

      // act on the operator and value
      value = $.trim(value);

      var isFilterNumber = isNumber(filter);

      // Special case for those number filter expectations where the data is
      // absent.
      if (isFilterNumber
          && ((value == "") || (value == "NaN") || (value == Number.NaN)))
      {
        return true;
      }
      else if (operator === 'gt')
      {
        // greater than operator
        if (areNumbers(value, filter))
        {
          return parseFloat(value) <= parseFloat(filter);
        }
        else if (areStrings(value, filter))
        {
          return value.toUpperCase() <= filter.toUpperCase();
        }
        else
        {
          return value <= filter;
        }
      }
      else if (operator == 'lt')
      {
        // less-than operator
        if (areNumbers(value, filter))
        {
          return parseFloat(value) >= parseFloat(filter);
        }
        else if (areStrings(value, filter))
        {
          return value.toUpperCase() >= filter.toUpperCase();
        }
        else
        {
          return value >= filter;
        }
      }
      else if (operator == 'ge')
      {
        // greater-than or equals operator
        if (areNumbers(value, filter))
        {
          return parseFloat(value) < parseFloat(filter);
        }
        else if (areStrings(value, filter))
        {
          return value.toUpperCase() < filter.toUpperCase();
        }
        else
        {
          return value < filter;
        }
      }
      else if (operator == 'le')
      {
        // less-than or equals operator
        if (areNumbers(value, filter))
        {
          return parseFloat(value) > parseFloat(filter);
        }
        else if (areStrings(value, filter))
        {
          return value.toUpperCase() > filter.toUpperCase();
        }
        else
        {
          return value > filter;
        }
      }
      else if (exactMatch === true)
      {
        return (value.toString().toUpperCase()
                !== filter.toString().toUpperCase());
      }
      else
      {
        filter = $.ui.autocomplete.escapeRegex(filter);

        var regex = new RegExp(filter, "gi");
        var result = value.match(regex);

        return (!result || result.length == 0);
      }
    }

    function isNumber(val)
    {
      return !isNaN(parseFloat(val)) && isFinite(val);
    }

    function areNumbers()
    {
      for (var i = 0; i < arguments.length; i++)
      {
        if (!isNumber(arguments[i]))
        {
          return false;
        }
      }
      return true;
    }

    function areStrings()
    {
      for (var i = 0; i < arguments.length; i++)
      {
        if (!(arguments[i].substring))
        {
          return false;
        }
      }
      return true;
    }

    /**
     * Calculate the width of a column from its longest value.
     * @param _column     The column to calculate for.
     * @returns {number}  The integer width.
     */
    function calculateColumnWidth(_column)
    {
      var columnName = _column.name;
      var colOpts = getOptionsForColumn(_column.id);
      var minWidth = columnName.length;
      var longestCalculatedWidth = getLongestValue(_column.id);
      var textWidthToUse = (longestCalculatedWidth > minWidth)
        ? longestCalculatedWidth : minWidth;

      var lengthStr = "";
      var userColumnWidth = colOpts.width;

      for (var v = 0; v < textWidthToUse; v++)
      {
        lengthStr += "_";
      }

      $_lengthFinder.addClass(_column.name);
      $_lengthFinder.text(lengthStr);

      var width = ($_lengthFinder.width() + 1);
      var colWidth = (userColumnWidth || width);

      $_lengthFinder.removeClass(_column.name);
      $_lengthFinder.empty();

      // Adjust width for cell padding.
      return colWidth + cadc.vot.DEFAULT_CELL_PADDING_PX;
    }

    /**
     * Used for resetting the force fit column widths.
     */
    function resetColumnWidths()
    {
      var allCols = getColumns();

      for (var i = 0; i < allCols.length; i++)
      {
        var col = allCols[i];
        var initialWidth = getOptionsForColumn(col.id).width;

        if (initialWidth && (initialWidth !== Number(0)))
        {
          col.width = initialWidth;
        }
        else
        {
          setColumnWidth(col);
        }
      }

      var gridColumns = getGrid().getColumns();
      var dupGridColumns = [];
      var totalWidth = 0;

      // Handle the visible columns
      for (var j = 0, jl = gridColumns.length; j < jl; j++)
      {
        var gridColumn = gridColumns[j];
        var existingColumn = getColumn(gridColumn.id);

        // Update the equivalent in the grid, if it's there.
        if (existingColumn)
        {
          gridColumn.width = existingColumn.width;
        }

        totalWidth += gridColumn.width;

        dupGridColumns.push(gridColumn);
      }

      getGrid().setColumns(dupGridColumns);

      if (totalWidth > 0)
      {
        $(getTargetNodeSelector()).css("width", (totalWidth + 15) + "px");

        if (usePager())
        {
          $(getPagerNodeSelector()).css("width", (totalWidth + 15) + "px");
        }

        $(getHeaderNodeSelector()).css("width", (totalWidth + 15) + "px");
      }

      _self.refreshGrid();
    }

    function setColumnWidth(_columnDefinition)
    {
      // Do not calculate with checkbox column.
      if ((_columnDefinition.id != cadc.vot.CHECKBOX_SELECTOR_COLUMN_ID)
          && (isFitMax(_columnDefinition.id) || getOptions().forceFitColumns))
      {
        _columnDefinition.width = calculateColumnWidth(_columnDefinition);
      }
    }

    /**
     * Perform the filter of data.  This is typically called from the input
     * field, but is useful as a test function here.
     *
     * @param _value      The input value.
     * @param _columnID   The Column ID to tie to.
     */
    function doFilter(_value, _columnID)
    {
      if (_columnID)
      {
        var filter = $.trim(_value);
        setColumnFilter(_columnID, filter);
        getColumnFilters()[_columnID] = filter;

        $(getGridColumn(_columnID)).data("pureFilterValue", filter);

        getDataView().refresh();
      }
    }

    function setupHeader(checkboxSelector, args)
    {
      $(args.node).empty();

      // Display the label for the checkbox column filter row.
      if (checkboxSelector
          && (args.column.id == checkboxSelector.getColumnDefinition().id))
      {
        $("<div class='filter-boxes-label' "
          +
          "title='Enter values into the boxes to further filter results.'>Filter:</div>").
          appendTo(args.node);
      }
      // Do not display for the checkbox column.
      else if (isFilterable(args.column))
      {
        var datatype = args.column.datatype;
        var tooltipTitle;

        if (datatype.isNumeric())
        {
          tooltipTitle =
            "Number: 10 or >=10 or 10..20 for a range , ! to negate";
        }
        else
        {
          tooltipTitle = "String: Substring match , ! to negate matches";
        }

                var $filterInput =
          $("<input type='text'>")
            .data("columnId", args.column.id)
            .val(getColumnFilters()[args.column.id])
            .attr("title", tooltipTitle)
            .attr("id", args.column.id + "_filter")
            .addClass("cadcvotv-filter-input")
            .appendTo(args.node);

        // Story 1647
        //
        // Having a big if/else is really a bad idea, but I don't know how to
        // dynamically specify a plugin name.
        //
        // jenkinsd 2014.12.03
        //
        if (getColumnFilterPluginName() === "suggest")
        {
          $filterInput.cadcVOTV_filter_suggest(_self,
                                               getOptions().suggest_maxRowCount);
        }
        else
        {
          $filterInput.cadcVOTV_filter_default(_self);
        }
      }
      else
      {
        // Allow for overrides per column.
        $("<span class=\"empty\"></span>").appendTo(args.node);
        $(args.node).css("height", "100%");
      }
    }

    /**
     * Initialize this VOViewer.
     */
    function init()
    {
      var forceFitMax = (getColumnManager().forceFitColumns
                         && getColumnManager().forceFitColumnMode
                         && (getColumnManager().forceFitColumnMode
                             == "max"));
      var checkboxSelector;
      var enableSelection = !getOptions().enableSelection
                            || getOptions().enableSelection == true;

      if ((typeof CADC !== 'undefined') && CADC.CheckboxSelectColumn)
      {
        checkboxSelector = new CADC.CheckboxSelectColumn({
          cssClass: "slick-cell-checkboxsel",
          width: 55,
          headerCssClass: "slick-header-column-checkboxsel",
          headerCheckboxLabel: getOptions().headerCheckboxLabel,
          enableOneClickDownload: getOptions().enableOneClickDownload,
          oneClickDownloadURL: getOptions().oneClickDownloadURL,
          oneClickDownloadTitle: getOptions().oneClickDownloadTitle,

          // The ID of the column to pull the unique link from.
          oneClickDownloadURLColumnID: getOptions().oneClickDownloadURLColumnID
        });
      }
      else if (Slick.CheckboxSelectColumn)
      {
        checkboxSelector = new Slick.CheckboxSelectColumn({
          cssClass: "slick-cell-checkboxsel",
          width: 55,
          headerCssClass: "slick-header-column-checkboxsel",
          checkboxLabel: "Mark"
        });
      }
      else
      {
        checkboxSelector = null;
      }

      if (checkboxSelector && enableSelection)
      {
        var checkboxColumn = checkboxSelector.getColumnDefinition();
        var colsToCheck = (getDisplayColumns().length == 0)
          ? getColumns() : getDisplayColumns();

        var checkboxColumnIndex = -1;

        $.each(colsToCheck, function (index, val)
        {
          if (checkboxColumn.id == val.id)
          {
            checkboxColumnIndex = index;
          }
        });

        if (checkboxColumnIndex < 0)
        {
          getColumns().splice(0, 0, checkboxColumn);
          getDisplayColumns().splice(0, 0, checkboxColumn);
        }
        else
        {
          getColumns()[checkboxColumnIndex] = checkboxColumn;
          getDisplayColumns()[checkboxColumnIndex] = checkboxColumn;
        }
      }

      getOptions().defaultFormatter = function (row, cell, value, columnDef,
                                                dataContext)
      {
        var returnValue;

        if (value == null)
        {
          returnValue = "";
        }
        else
        {
          returnValue = value.toString().replace(/&/g, "&amp;").
            replace(/</g, "&lt;").replace(/>/g, "&gt;");
        }

        return "<span class='cellValue " + columnDef.id
               + "' title='" + returnValue + "'>" + returnValue + "</span>";
      };

      var dataView = new Slick.Data.DataView({inlineFilters: true});
      var grid = new Slick.Grid(getTargetNodeSelector(), dataView,
                                getDisplayColumns(), getOptions());
      var rowSelectionModel;

      if (checkboxSelector)
      {
        if ((typeof CADC !== 'undefined')
            && (typeof CADC.RowSelectionModel !== 'undefined'))
        {
          rowSelectionModel =
            new CADC.RowSelectionModel({
              selectActiveRow: getOptions().selectActiveRow,
              selectClickedRow: getOptions().selectClickedRow,
              propagateEvents: getOptions().propagateEvents
            });
        }
        else if (Slick.RowSelectionModel)
        {
          rowSelectionModel =
            new Slick.RowSelectionModel({
              selectActiveRow: getOptions().selectActiveRow
            });
        }
        else
        {
          rowSelectionModel = null;
        }

        if (rowSelectionModel)
        {
          grid.setSelectionModel(rowSelectionModel);
        }

        grid.registerPlugin(checkboxSelector);
      }
      else
      {
        rowSelectionModel = null;
      }

      if (usePager())
      {
        new Slick.Controls.Pager(dataView, grid, $(getPagerNodeSelector()));
      }
      else
      {
        dataView.onPagingInfoChanged.subscribe(function()
                                             {
                                               _self.atDataLoadComplete(
                                                 getTotalRows(),
                                                 getCurrentRows(),
                                                 getHeaderLabel());
                                             });
      }

      dataView.onRowCountChanged.subscribe(function(e, args)
                                           {
                                             trigger(cadc.vot.events.onRowsChanged,
                                                     args);
                                           });

      var columnPickerConfig = getColumnManager().picker;

      if (columnPickerConfig)
      {
        var columnPicker;
        var pickerStyle = columnPickerConfig.style;

        if (pickerStyle == "dialog")
        {
          columnPicker =
            new cadc.vot.picker.DialogColumnPicker(getColumns(), grid,
                                                   columnPickerConfig.options);

          if (forceFitMax)
          {
            cadc.vot.picker.events.onSort.subscribe(resetColumnWidths);
            cadc.vot.picker.events.onResetColumnOrder.subscribe(resetColumnWidths);
            cadc.vot.picker.events.onShowAllColumns.subscribe(resetColumnWidths);
            cadc.vot.picker.events.onSortAlphabetically.subscribe(resetColumnWidths);
          }

          cadc.vot.picker.events.onColumnAddOrRemove.subscribe(function ()
                                                               {
                                                                 if (rowSelectionModel)
                                                                 {
                                                                   // Refresh.
                                                                   rowSelectionModel.refreshSelectedRanges();
                                                                 }
                                                               });

          cadc.vot.picker.events.onResetColumnOrder.subscribe(function ()
                                                              {
                                                                // Clear the
                                                                // hash.
                                                                parent.location.hash =
                                                                  '';
                                                                trigger(cadc.vot.events.onColumnOrderReset, null);
                                                              });
        }
        else if (pickerStyle == "header")
        {
          columnPicker = new Slick.Controls.ColumnPicker(getColumns(),
                                                         grid, getOptions());
          if (forceFitMax)
          {
            columnPicker.onColumnAddOrRemove.subscribe(resetColumnWidths);
          }

          columnPicker.onResetColumnOrder.subscribe(function ()
                                                    {
                                                      // Clear the hash.
                                                      parent.location.hash = '';
                                                      trigger(cadc.vot.events.onColumnOrderReset, null);
                                                    });
        }
        else if (pickerStyle == "tooltip")
        {
          columnPicker =
            new Slick.Controls.PanelTooltipColumnPicker(getColumns(),
                                                        grid,
                                                        columnPickerConfig.panel,
                                                        columnPickerConfig.tooltipOptions,
                                                        columnPickerConfig.options);

          if (forceFitMax)
          {
            columnPicker.onSort.subscribe(resetColumnWidths);
            columnPicker.onResetColumnOrder.subscribe(resetColumnWidths);
            columnPicker.onShowAllColumns.subscribe(resetColumnWidths);
            columnPicker.onSortAlphabetically.subscribe(resetColumnWidths);
          }

          columnPicker.onColumnAddOrRemove.subscribe(function ()
                                                     {
                                                       if (rowSelectionModel)
                                                       {
                                                         // Refresh.
                                                         rowSelectionModel.refreshSelectedRanges();
                                                       }
                                                     });

          columnPicker.onResetColumnOrder.subscribe(function ()
                                                    {
                                                      // Clear the hash.
                                                      parent.location.hash = '';
                                                      trigger(cadc.vot.events.onColumnOrderReset, null);
                                                    });
        }
        else
        {
          columnPicker = null;
        }
      }

      if (forceFitMax)
      {
        var totalWidth = 0;
        var gridColumns = grid.getColumns();

        for (var c in gridColumns)
        {
          var nextCol = gridColumns[c];
          totalWidth += nextCol.width;
        }

        $(getTargetNodeSelector()).css("width", totalWidth + "px");

        if (usePager())
        {
          $(getPagerNodeSelector()).css("width", totalWidth + "px");
        }

        $(getHeaderNodeSelector()).css("width", totalWidth + "px");
        grid.resizeCanvas();
      }

      // move the filter panel defined in a hidden div into grid top panel
      $("#inlineFilterPanel").appendTo(grid.getTopPanel()).show();

      grid.onKeyDown.subscribe(function (e)
                               {
                                 // select all rows on ctrl-a
                                 if ((e.which != 65) || !e.ctrlKey)
                                 {
                                   return false;
                                 }

                                 var rows = [];
                                 for (var i = 0; i < grid.getDataLength(); i++)
                                 {
                                   rows.push(i);
                                 }

                                 grid.setSelectedRows(rows);
                                 e.preventDefault();

                                 return true;
                               });

      /**
       * Tell the dataview to do the comparison.
       */
      var doGridSort = function ()
      {
        if (_self.sortcol)
        {
          var sortColumn = _self.getColumn(_self.sortcol);

          // In the odd chance that the sort column is not in the displayed
          // column list.
          if (sortColumn)
          {
            var isnumeric = sortColumn.datatype.isNumeric();
            sortColumn.comparer.setIsNumeric(isnumeric);
            sortColumn.comparer.setSortColumn(_self.sortcol);

            var data = getGrid().getData();

            // using native sort with comparer
            // preferred method but can be very slow in IE
            // with huge datasets
            data.sort(sortColumn.comparer.compare, _self.sortAsc);
            data.refresh();
          }

          grid.invalidateAllRows();
          grid.render();
        }
      };

      /**
       * Handle the local sort events.  These events are fired for the initial
       * sort when the Grid is loaded, if any.
       *
       * WebRT 53730
       */
      subscribe(cadc.vot.events.onSort, function (eventData, args)
      {
        _self.sortAsc = args.sortAsc;
        _self.sortcol = args.sortCol;

        doGridSort();
      });

      /**
       * Handle the Grid sorts.
       */
      grid.onSort.subscribe(function (e, args)
                            {
                              _self.sortAsc = args.sortAsc;
                              _self.sortcol = args.sortCol.field;

                              doGridSort();
                            });

      if (getRowManager().onRowRendered)
      {
        grid.onRowsRendered.subscribe(function (e, args)
                                      {
                                        var indexes = args.renderedRowIndexes;

                                        for (var r = 0, rri = indexes.length;
                                             r < rri; r++)
                                        {
                                          var nextRowIndex = indexes[r];
                                          var $nextRow =
                                            grid.getData().getItem(nextRowIndex);
                                          getRowManager().onRowRendered($nextRow,
                                                                        nextRowIndex);
                                        }
                                      });
      }

      dataView.onPagingInfoChanged.subscribe(function (e, pagingInfo)
                                             {
                                               var isLastPage =
                                                 (pagingInfo.pageNum ==
                                                  pagingInfo.totalPages - 1);
                                               var enableAddRow =
                                                 (isLastPage ||
                                                  pagingInfo.pageSize == 0);
                                               var options = grid.getOptions();

                                               if (options.enableAddRow !=
                                                   enableAddRow)
                                               {
                                                 grid.setOptions({enableAddRow: enableAddRow});
                                               }
                                             });

      $(window).resize(function ()
                       {
                         _self.setViewportHeight();
                         grid.resizeCanvas();
                         grid.invalidateAllRows();
                         grid.render();
                       });

      grid.onHeaderRowCellRendered.subscribe(function (e, args)
                                             {
                                               setupHeader(checkboxSelector,
                                                           args);
                                             });

      if (Slick.Plugins && Slick.Plugins.UnitSelection)
      {
        var unitSelectionPlugin = new Slick.Plugins.UnitSelection();

        // Extend the filter row to include the pulldown menu.
        unitSelectionPlugin.onUnitChange.subscribe(function (e, args)
                                                   {
                                                     if (columnPicker.updateColumnData)
                                                     {
                                                       columnPicker.updateColumnData(
                                                         args.column.id,
                                                         "unitValue",
                                                         args.unitValue);
                                                     }

                                                     // track select changes.
                                                     _self.updatedColumnSelects[args.column.id] =
                                                       args.unitValue;

                                                     // Invalidate to force
                                                     // column reformatting.
                                                     grid.invalidate();

                                                     trigger(cadc.vot.events.onUnitChanged,
                                                             args);
                                                   });

        grid.registerPlugin(unitSelectionPlugin);
      }

      // Track the width of resized columns.
      grid.onColumnsResized.subscribe(function (e, args)
                                      {
                                        var columns = args.grid.getColumns();

                                        for (var i = 0, ci = columns.length;
                                             i < ci; i++)
                                        {
                                          var column = columns[i];

                                          if (column.width !==
                                              column.previousWidth)
                                          {
                                            getResizedColumns[column.id] =
                                              column.width;
                                            return false;
                                          }
                                        }
                                      });

      setGrid(grid);

      if (forceFitMax)
      {
        resetColumnWidths();
      }

      sort();
    }

    /**
     * Load a fresh copy into this this.  This assumes first time load.
     *
     * @param voTable         The built VOTable.
     * @param _refreshColumns  Whether to refresh the columns (true/false).
     * @param _refreshData     Whether to refresh the data (true/false).
     */
    function load(voTable, _refreshColumns, _refreshData)
    {
      // Use the first Table of the first Resource only.
      var resource = voTable.getResources()[0];

      if (!resource)
      {
        throw new Error("No resource available.");
      }

      var table = resource.getTables()[0];

      if (!table)
      {
        throw new Error("No table available.");
      }

      setLongestValues(table.getTableData().getLongestValues());

      if (_refreshColumns)
      {
        refreshColumns(table.getFields());
      }

      if (_refreshData)
      {
        refreshData(table);
      }
    }

    /**
     * Refresh this Viewer's columns.
     *
     * WARNING: This will clear ALL of the columns, including the checkbox
     * selector column.  Generally, this method will only be called to
     * initialize the columns from the init() method, or when first building
     * the viewer.
     *
     * @param _fields   A Table in the VOTable.
     */
    function refreshColumns(_fields)
    {
      clearColumns();
      var columnManager = getColumnManager();

      for (var fi = 0, fl = _fields.length; fi < fl; fi++)
      {
        var field = _fields[fi];
        var fieldKey = field.getID();
        var colOpts = getOptionsForColumn(fieldKey);
        var cssClass = colOpts.cssClass;
        var datatype = field.getDatatype();
        var filterable = (columnManager.filterable === true);

        if (colOpts)
        {
          if (colOpts.filterable === true)
          {
            filterable = true;
          }
          else if (colOpts.filterable === false)
          {
            filterable = false;
          }
        }

        // We're extending the column properties a little here.
        var columnObject =
        {
          id: fieldKey,
          name: field.getName(),
          field: fieldKey,
          formatter: colOpts.formatter,
          asyncPostRender: colOpts.asyncFormatter,
          cssClass: cssClass,
          description: field.getDescription(),
          resizable: getColumnManager().resizable,
          sortable: colOpts.sortable ? colOpts.sortable : true,

          // VOTable attributes.
          unit: field.getUnit(),
          utype: field.getUType(),
          filterable: filterable,
          comparer: colOpts.comparer ? colOpts.comparer :
                    new cadc.vot.Comparer()
        };

        // Default is to be sortable.
        columnObject.sortable =
          ((colOpts.sortable != null) && (colOpts.sortable != undefined))
            ? colOpts.sortable : true;

        if (datatype)
        {
          columnObject.datatype = datatype;
        }

        columnObject.header = colOpts.header;

        if (colOpts.width)
        {
          columnObject.width = colOpts.width;
        }
        else if (columnManager.forceFitColumns || isFitMax(columnObject.id))
        {
          columnObject.width = calculateColumnWidth(columnObject);
        }

        addColumn(columnObject);
      }
    }

    function formatCellValue(rowItem, grid, columnID)
    {
      var columnIndex = grid.getColumnIndex(columnID);
      var column = grid.getColumns()[columnIndex];
      var cellValue = rowItem[column.field];
      var rowID = rowItem["id"];
      var columnFormatter = column.formatter;
      var formattedCellValue;

      // Reformatting the cell value could potentially be quite expensive!
      // This may require some re-thinking.
      // jenkinsd 2013.04.30
      if (columnFormatter)
      {
        var row = grid.getData().getIdxById(rowID);
        var columnFormattedValue =
          columnFormatter(row, columnIndex, cellValue, column, rowItem);
        formattedCellValue =
          columnFormattedValue && $(columnFormattedValue).text
            ? $(columnFormattedValue).text() : columnFormattedValue;
      }
      else
      {
        formattedCellValue = cellValue;
      }

      return formattedCellValue;
    }

    /**
     * Function for the search filter to run.  This is meant to be in the
     * context of the dataView, so 'this' will refer to the current instance of
     * the data view.
     *
     * @param item      Filter item.
     * @param args      columnFilters - columnFilter object.
     *                  grid - grid object.
     *                  doFilter - filter method.
     * @returns {boolean}
     */
    function searchFilter(item, args)
    {
      var filters = args.columnFilters;
      var grid = args.grid;

      for (var columnId in filters)
      {
        var filterValue = filters[columnId];
        if ((columnId !== undefined) && (filterValue !== ""))
        {
          var cellValue = args.formatCellValue(item, grid, columnId);

          filterValue = $.trim(filterValue);
          var negate = filterValue.indexOf("!") == 0;

          if (negate)
          {
            filterValue = filterValue.substring(1);
          }

          // The args.doFilter method is in the Grid's DataView object.
          var filterOut = args.doFilter(filterValue, cellValue);

          if ((!negate && filterOut) || (!filterOut && negate))
          {
            return false;
          }
        }
      }

      return true;
    }

    /**
     * Clean refresh of the data rows.
     *
     * @param table   A Table element from a VOTable.
     */
    function refreshData(table)
    {
      clearRows();

      // Make a copy of the array so as not to disturb the original.
      var allRows = table.getTableData().getRows();

      $.each(allRows, function (rowIndex, row)
      {
        addRow(row, rowIndex);
      });
    }

    function render()
    {
      var g = getGrid();
      var dataView = g.getData();

      // initialize the model after all the events have been hooked up
      dataView.beginUpdate();
      dataView.setFilterArgs({
        columnFilters: getColumnFilters(),
        grid: g,
        formatCellValue: formatCellValue,
        doFilter: valueFilters
      });

      dataView.setFilter(searchFilter);
      dataView.endUpdate();

      if (g.getSelectionModel())
      {
        // If you don't want the items that are not visible (due to being
        // filtered out or being on a different page) to stay selected, pass
        // 'false' to the second arg
        dataView.syncGridSelection(g, true);
      }

      var gridContainer = $(getTargetNodeSelector());

      if (gridContainer.resizable && getOptions().gridResizable)
      {
        gridContainer.resizable();
      }

      g.init();
    }

    /**
     * Fire an event.  Taken from the slick.grid Object.
     *
     * @param _event       The Event to fire.
     * @param _args        Arguments to the event.
     * @returns {*}       The event notification result.
     */
    function trigger(_event, _args)
    {
      var args = _args || {};
      args.application = _self;

      return $(_self).trigger(_event, args);
    }

    /**
     * Subscribe to one of this form's events.
     *
     * @param _event      Event object.
     * @param __handler   Handler function.
     */
    function subscribe(_event, __handler)
    {
      $(_self).on(_event.type, __handler);
    }

    /**
     * Remove event subscriptions and all that.
     */
    function destroy()
    {
      var g = getGrid();
      var handler = new Slick.EventHandler();

      handler.unsubscribeAll();

      if (g)
      {
        g.destroy();
      }
    }

    function defaultDataLoadComplete()
    {
      var $gridHeaderLabel = getHeaderLabel();
      if (options.maxRowLimit <= getTotalRows())
      {
        // and display warning message if maximum row limit is reached
        $gridHeaderLabel.text($gridHeaderLabel.text() + " " +
                              options.maxRowLimitWarning);
        getHeader().css("background-color", "rgb(235, 235, 49)");
      }
      else
      {
        $gridHeaderLabel.text(getRowCountMessage(getTotalRows(),
                                                 getCurrentRows()));
      }
    }

    function defaultPageChanging(count1, count2, $label)
    {
      $label.text(getRowCountMessage(count1, count2));
    }

    function getTotalRows()
    {
      return getGrid().getDataLength();
    }

    function getCurrentRows()
    {
      return getGrid().getData().getItems().length;
    }

    $.extend(this,
      {
        "init": init,
        "build": build,
        "render": render,
        "load": load,
        "doFilter": doFilter,
        "areNumbers": areNumbers,
        "areStrings": areStrings,
        "getOptions": getOptions,
        "setOptions": setOptions,
        "refreshGrid": refreshGrid,
        "getGrid": getGrid,
        "getDataView": getDataView,
        "getColumn": getGridColumn,
        "getColumns": getColumns,
        "setColumns": setColumns,
        "clearColumns": clearColumns,
        "getSelectedRows": getSelectedRows,
        "getRow": getRow,
        "getRows": getRows,
        "addRow": addRow,
        "destroy": destroy,
        "clearColumnFilters": clearColumnFilters,
        "getColumnFilters": getColumnFilters,
        "setColumnFilter": setColumnFilter,
        "setDisplayColumns": setDisplayColumns,
        "getDisplayedColumns": getDisplayedColumns,
        "valueFilters": valueFilters,
        "searchFilter": searchFilter,
        "formatCellValue": formatCellValue,
        "setSortColumn": setSortColumn,
        "getResizedColumns": getResizedColumns,
        "getUpdatedColumnSelects": getUpdatedColumnSelects,
        "setViewportHeight": setViewportHeight,
        "setViewportOffset": setViewportOffset,

        // Used for testing
        "setupHeader": setupHeader,

        // Event subscription
        "subscribe": subscribe
      });
  }
})(jQuery);
