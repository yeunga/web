(function ($) {
  // register namespace
  $.extend(true, window, {
    "cadc": {
      "vot": {
        "Viewer": Viewer
      }
    }
  });
//var sortAsc;
//var sortcol;


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
    this.dataView = null;
    this.grid = null;
    this.columnManager = options.columnManager ? options.columnManager : {};
    this.rowManager = options.rowManager ? options.rowManager : {};
    this.data = [];
    this.columns = [];
    this.displayColumns = [];  // Columns that are actually in the Grid.
    this.columnFilters = {};
    this.targetNodeSelector = targetNodeSelector;
    this.columnOptions = options.columnOptions ? options.columnOptions : {};
    this.options = options;
    this.options.forceFitColumns = options.columnManager
        ? options.columnManager.forceFitColumns
        : false;

    // This is the TableData for a VOTable.  Will be set on load.
    this.voTableData = null;

    this.sortcol = options.sortColumn;
    this.sortAsc = options.sortDir == "asc";

  //  viewer = this;

    /**
     * @param input  Object representing the input.
     *
     * One of xmlDOM or json or url is required.
     *
     * input.xmlDOM = The XML DOM Object
     * input.json = The JSON Object
     * input.url = The URL of the input.  The Content-Type will dictate how to
     *             build it.
     * @param completeCallback  Callback function when complete.
     * @param errorCallBack     Callback function with jqXHR, status, message
     *                    (Conforms to jQuery error callback for $.ajax calls).
     */
    function build(input, completeCallback, errorCallBack)
    {
      new cadc.vot.Builder(input,
                           function (voTableBuilder)
                           {
                             voTableBuilder.build();

                             var voTable = voTableBuilder.getVOTable();
                             var hasDisplayColumns =
                                 (_self.displayColumns
                                     && (_self.displayColumns.length > 0));

                             _self.load(voTable, !hasDisplayColumns, true);
                             _self.init();

                             if (completeCallback)
                             {
                               completeCallback();
                             }
                           }, errorCallBack);
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

    function getColumnFilters()
    {
      return _self.columnFilters;
    }

    function clearColumnFilters()
    {
      _self.columnFilters = {};
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

    function comparer(a, b)
    {
      var x = a[sortcol], y = b[sortcol];
      return (x == y ? 0 : (x > y ? 1 : -1));
    }

    function addRow(rowData, rowIndex)
    {
      getGridData()[rowIndex] = rowData;
    }

    function clearRows()
    {
      _self.data.length = 0;
    }

    function setDataView(dataViewObject)
    {
      _self.dataView = dataViewObject;
    }

    function getDataView()
    {
      return _self.dataView;
    }

    function setGrid(gridObject)
    {
      _self.grid = gridObject;
    }

    function getSelectedRows()
    {
      return getGrid().getSelectedRows();
    }

    function getRowByIndex(_index)
    {
      return getDataView().getItemByIdx(_index);
    }

    function getRow(_index)
    {
      return getDataView().getItem(_index);
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

    function getColumn(columnID)
    {
      return getGrid().getColumns()[
          getGrid().getColumnIndex(columnID)];
    }

    function sort()
    {
      if (_self.sortcol)
      {
        getGrid().setSortColumn(_self.sortcol, (_self.sortAsc || (_self.sortAsc == 1)));
      }
    }

    function getGridData()
    {
      return _self.data;
    }

    function getOptions()
    {
      return _self.options;
    }

    function setOptions(optionsDef)
    {
      _self.options = optionsDef;
    }

    function usePager()
    {
      return getOptions() && getOptions().pager;
    }

    /**
     * Obtain the TableData instance for this VOTable representation.
     *
     * @returns {*}   TableData instance.
     */
    function getVOTableData()
    {
      return _self.voTableData;
    }

    function setVOTableData(__voTableData)
    {
      _self.voTableData = __voTableData;
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
     * Get the columns that ARE CURRENTLY displayed.  Useful for saving for future
     * profile usage (i.e. restoring previous session).
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
        for (var colID in defaultColumnIDs)
        {
          if (defaultColumnIDs[colID])
          {
            var thisCols = getColumns();
            for (var col in thisCols)
            {
              if (thisCols[col].id == defaultColumnIDs[colID])
              {
                cols.push(thisCols[col]);
              }
            }
          }
        }
      }

      return cols;
    }

    /**
     * This function is passed to SlickGrid, so be careful when using 'this'.
     *
     * @param item        The item to filter on.
     * @return {boolean}   True if passes the filter, false otherwise.
     */
//    function searchFilter(item)
//    {
//      var filters = _self.getColumnFilters();
//      for (var columnId in filters)
//      {
//        var filterValue = filters[columnId];
//        if ((columnId !== undefined) && (filterValue !== ""))
//        {
//          var column = _self.getColumn(columnId);
//          var cellValue = item[column.field];
//          var rowID = item["id"];
//          var columnFormatter = column.formatter;
//
//          // Reformatting the cell value could potentially be quite exensive!
//          // This may require some re-thinking.
//          // jenkinsd 2013.04.30
//          if (columnFormatter)
//          {
//            var cell = _self.getGrid().getColumnIndex(column.id);
//            var row = _self.getDataView().getIdxById(rowID);
//            var formattedCellValue =
//                columnFormatter(row, cell, cellValue, column, item);
//
//            cellValue = formattedCellValue && $(formattedCellValue).text
//                ? $(formattedCellValue).text() : formattedCellValue;
//          }
//
//          filterValue = $.trim(filterValue);
//          var negate = filterValue.indexOf("!") == 0;
//
//          if (negate)
//          {
//            filterValue = filterValue.substring(1);
//          }
//
//          var filterOut = _self.valueFilters(filterValue, cellValue);
//
//          if ((!negate && filterOut) || (!filterOut && negate))
//          {
//            return false;
//          }
//        }
//      }
//
//      return true;
//    }

    /**
     * @param filter    The filter value as entered by the user.
     * @param value     The value to be filtered or not
     * @returns {Boolean} true if value is filtered-out by filter.
     */
    function valueFilters(filter, value)
    {
      var operator = '';
      filter = $.trim(filter);

      // determine the operator and filter value
      if (filter.indexOf('= ') == 0)
      {
        filter = filter.substring(2);
      }
      else if (filter.indexOf('=') == 0)
      {
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
      if (operator === 'gt')
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
      else
      {
        // equals operator
        if (filter.indexOf('*') > -1)
        {
          // wildcard match (Replace all instances of '*' with '.*')
          filter = filter.replace(/\*/g, ".*");

          var regex = new RegExp("^" + filter + "$", "gi");
          var result = value.match(regex);

          return (!result || result.length == 0);
        }
        else
        {
          // plain equals match
          if (areNumbers(value, filter))
          {
            return (parseFloat(value) != parseFloat(filter));
          }
          else if (areStrings(value, filter))
          {
            return (value.toUpperCase() !== filter.toUpperCase());
          }
          else
          {
            return (value !== filter);
          }
        }
      }

    }

    function isFloatDatatype(datatype)
    {
      return (datatype
          && ((datatype == "float") || (datatype == "double")));
    }

    function isIntegerDatatype(datatype)
    {
      return (datatype
          && ((datatype == "int") || (datatype == "short")
          || (datatype == "long")));
    }

    function isNumericDatatype(datatype)
    {
      return (isFloatDatatype(datatype) || isIntegerDatatype(datatype));
    }

    function areNumbers()
    {
      for (var i = 0; i < arguments.length; i++)
      {
        if (isNaN(arguments[i]))
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
     * Check if this Viewer contains the given column.  Used to stop duplicate
     * checkbox columns being added.
     *
     * @return  boolean True if the viewer has the given column, false otherwise.
     */
    function hasColumn(columnDefinition)
    {
      var cols = getColumns();

      for (var col in cols)
      {
        var nextCol = cols[col];

        if (nextCol.id && (nextCol.id == columnDefinition.id))
        {
          return true;
        }
      }

      return false;
    }

    // Used for resetting the force fit column widths.
    function resetColumnWidths(checkboxSelector)
    {
      var g = getGrid();
      var gridColumns = g.getColumns();
      var totalWidth = 0;
      var tabData = getVOTableData();

      for (var c in gridColumns)
      {
        var col = gridColumns[c];
        var colWidth;

        // Do not calculate with checkbox column.
        if (!checkboxSelector
            || (col.id != checkboxSelector.getColumnDefinition().id))
        {
          var colOpts = getOptionsForColumn(col.name);
          var minWidth = col.name.length + 3;
          var longestCalculatedWidth = tabData.getLongestValueLength(col.id);
          var textWidthToUse = (longestCalculatedWidth > minWidth)
              ? longestCalculatedWidth : minWidth;

          var lengthDiv = $("<div></div>");
          var lengthStr = "";
          var userColumnWidth = colOpts.width;

          for (var v = 0; v < textWidthToUse; v++)
          {
            lengthStr += "a";
          }

          lengthDiv.addClass("lengthFinder");
          lengthDiv.prop("style", "position: absolute;visibility: hidden;height: auto;width: auto;");
          lengthDiv.text(lengthStr);
          $(document.body).append(lengthDiv);

          colWidth = (userColumnWidth || lengthDiv.innerWidth());

          lengthDiv.remove();
        }
        else
        {
          // Buffer the checkbox.
          colWidth = col.width + 15;
        }

        totalWidth += colWidth;
      }

      if (totalWidth > 0)
      {
        $(getTargetNodeSelector()).css("width", totalWidth + "px");

        if (usePager())
        {
          $(getPagerNodeSelector()).css("width", totalWidth + "px");
        }

        $(getHeaderNodeSelector()).css("width", totalWidth + "px");
        g.resizeCanvas();
      }
    }

    /**
     * Initialize this VOViewer.
     */
    function init()
    {
      var dataView = new Slick.Data.DataView({ inlineFilters: true });
      var forceFitMax = (getColumnManager().forceFitColumns
                             && getColumnManager().forceFitColumnMode
          && (getColumnManager().forceFitColumnMode
          == "max"));
      var checkboxSelector;
      var enableSelection = !getOptions().enableSelection
                            || getOptions().enableSelection == true;

      if (Slick.CheckboxSelectColumn && enableSelection)
      {
        checkboxSelector = new Slick.CheckboxSelectColumn({
                                                            cssClass: "slick-cell-checkboxsel",
                                                            width: 55,
                                                            headerCssClass: "slick-header-column-checkboxsel"
                                                          });

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
      else
      {
        checkboxSelector = null;
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

      var grid = new Slick.Grid(getTargetNodeSelector(),
                                dataView, getDisplayColumns(),
                                getOptions());
      var rowSelectionModel;

      if (checkboxSelector)
      {
        if (CADC.RowSelectionModel)
        {
          rowSelectionModel =
              new CADC.RowSelectionModel({
                                           selectActiveRow: getOptions().selectActiveRow
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
        var pager = new Slick.Controls.Pager(dataView, grid,
                                             $(getPagerNodeSelector()));
      }
      else
      {
        // Use the Grid header otherwise.
        var gridHeaderLabel = $("#grid-header-label");

        if (gridHeaderLabel)
        {
          dataView.onPagingInfoChanged.subscribe(function (e, pagingInfo)
                                                 {
                                                   gridHeaderLabel.text("Showing " + pagingInfo.totalRows
                                                                            + " rows (" + getGridData().length
                                                                            + " before filtering)");
                                                 });
        }
      }

      var columnPickerConfig = getColumnManager().picker;

      if (columnPickerConfig)
      {
        var columnPicker;
        var pickerStyle = columnPickerConfig.style;

        if (pickerStyle == "header")
        {
          columnPicker = new Slick.Controls.ColumnPicker(getColumns(),
                                                         grid, getOptions());
          if (forceFitMax)
          {
            columnPicker.onColumnAddOrRemove.subscribe(resetColumnWidths);
          }
        }
        else if (pickerStyle == "tooltip")
        {
          columnPicker = new Slick.Controls.PanelTooltipColumnPicker(getColumns(),
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

          columnPicker.onColumnAddOrRemove.subscribe(function(e, args)
                                                     {
                                                       if (rowSelectionModel)
                                                       {
                                                         // Refresh.
                                                         rowSelectionModel.refreshSelectedRanges();
                                                       }
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

      grid.onCellChange.subscribe(function (e, args)
                                  {
                                    dataView.updateItem(args.item.id, args.item);
                                  });

      grid.onKeyDown.subscribe(function (e)
                               {
                                 // select all rows on ctrl-a
                                 if ((e.which != 65) || !e.ctrlKey)
                                 {
                                   return false;
                                 }

                                 var rows = [];
                                 for (var i = 0; i < dataView.getLength(); i++)
                                 {
                                   rows.push(i);
                                 }

                                 grid.setSelectedRows(rows);
                                 e.preventDefault();

                                 return true;
                               });

      grid.onSort.subscribe(function (e, args)
                            {
                              _self.sortAsc = args.sortAsc;
                              _self.sortcol = args.sortCol.field;

    //                          if ($.browser.msie && ($.browser.version <= 8))
    //                          {
                                // use numeric sort of % and lexicographic for everything else
    //                            dataView.fastSort(sortcol, args.sortAsc);
    //                          }
    //                          else
    //                          {
                                // using native sort with comparer
                                // preferred method but can be very slow in IE with huge datasets
                              dataView.sort(_self.comparer, args.sortAsc);
                              dataView.refresh();
    //                          }
                            });

      // wire up model events to drive the grid
      dataView.onRowCountChanged.subscribe(function (e, args)
                                           {
                                             grid.updateRowCount();
                                           });

      if (getRowManager().onRowRendered)
      {
        grid.onRowsRendered.subscribe(function(e, args)
                                      {
                                        $.each(args.renderedRowIndexes,
                                               function(rowIndexIndex, rowIndex)
                                               {
                                                 var $rowItem =
                                                     dataView.getItemByIdx(rowIndex);
                                                 getRowManager().onRowRendered($rowItem);
                                               });
                                      });
      }


      dataView.onRowsChanged.subscribe(function (e, args)
                                       {
                                         grid.invalidateRows(args.rows);
                                         grid.render();
                                       });

      dataView.onPagingInfoChanged.subscribe(function (e, pagingInfo)
                                             {
                                               var isLastPage =
                                                   (pagingInfo.pageNum == pagingInfo.totalPages - 1);
                                               var enableAddRow =
                                                   (isLastPage || pagingInfo.pageSize == 0);
                                               var options = grid.getOptions();

                                               if (options.enableAddRow != enableAddRow)
                                               {
                                                 grid.setOptions({enableAddRow: enableAddRow});
                                               }
                                             });

      $(window).resize(function ()
                       {
                         grid.resizeCanvas();
                       });

      $("#btnSelectRows").click(function ()
                                {
                                  if (!Slick.GlobalEditorLock.commitCurrentEdit())
                                  {
                                    return;
                                  }

                                  var rows = [];
                                  for (var i = 0;
                                       (i < 10) && (i < dataView.getLength()); i++)
                                  {
                                    rows.push(i);
                                  }

                                  grid.setSelectedRows(rows);
                                });


      var columnFilters = getColumnFilters();

      $(grid.getHeaderRow()).delegate(":input", "change keyup",
                                      function (e)
                                      {
                                        var columnId = $(this).data("columnId");
                                        if (columnId != null)
                                        {
                                          columnFilters[columnId] =
                                          $.trim($(this).val());
                                          dataView.refresh();
                                        }
                                      });

      grid.onHeaderRowCellRendered.subscribe(function (e, args)
                                             {
                                               $(args.node).empty();

                                               // Do not display for the checkbox column.
                                               if (args.column.filterable)
                                               {
                                                 $(args.node).empty();

                                                 // Display the label for the checkbox column filter row.
                                                 if (checkboxSelector
                                                     && (args.column.id == checkboxSelector.getColumnDefinition().id))
                                                 {
                                                   $("<div class='filter-boxes-label' "
                                                         + "title='Enter values into the boxes to further filter results.'>Filter:</div>").
                                                       appendTo(args.node);
                                                 }
                                                 // Allow for overrides per column.
                                                 else if (args.column.filterable == false)
                                                 {
                                                   $("<span class=\"empty\"></span>").
                                                       appendTo(args.node);
                                                 }
                                                 else
                                                 {
                                                   var datatype =
                                                       args.column.datatype;
                                                   var tooltipTitle;

                                                   if (isNumericDatatype(datatype))
                                                   {
                                                     tooltipTitle = "Number: 10 or >=10 or 10..20 for a range , ! to negate";
                                                   }
                                                   else
                                                   {
                                                     tooltipTitle = "String: abc (exact match) or *ab*c* , ! to negate";
                                                   }

                                                   $("<input type='text'>")
                                                       .data("columnId", args.column.id)
                                                       .val(columnFilters[args.column.id])
                                                       .prop("title", tooltipTitle)
                                                       .prop("id", args.column.utype + "_filter")
                                                       .appendTo(args.node);
                                                 }
                                               }
                                             });

      if (Slick.Plugins && Slick.Plugins.UnitSelection)
      {
        var unitSelectionPlugin = new Slick.Plugins.UnitSelection();

        // Extend the filter row to include the pulldown menu.
    //    $(".slick-headerrow-columns").css("height", "50px");

        unitSelectionPlugin.onUnitChange.subscribe(function (e, args)
                                                   {
                                                     if (columnPicker.updateColumnData)
                                                     {
                                                       columnPicker.updateColumnData(
                                                           args.column.id,
                                                           "unitValue",
                                                           args.unitValue);
                                                     }

                                                     // Invalidate to force column
                                                     // reformatting.
                                                     grid.invalidate();
                                                   });

        grid.registerPlugin(unitSelectionPlugin);
      }

    //  grid.onColumnsReordered.subscribe(function (e, args)
    //                                    {
    //                                      grid.invalidateRows();
    //                                    });

      setDataView(dataView);
      setGrid(grid);
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

      setVOTableData(table.getTableData());

      if (_refreshColumns)
      {
        refreshColumns(table);
      }

      if (_refreshData)
      {
        refreshData(table);
      }
    }

    /**
     * Refresh this VOViewer's columns.
     *
     * @param table   A Table in the VOTable.
     */
    function refreshColumns(table)
    {
      clearColumns();
//      var tableData = table.getTableData();
      var columnManager = getColumnManager();
      var forceFitMax = (columnManager.forceFitColumns
                             && columnManager.forceFitColumnMode
          && (columnManager.forceFitColumnMode == "max"));

      $.each(table.getFields(), function (fieldIndex, field)
      {
        var fieldKey = field.getID();
        var colOpts = getOptionsForColumn(fieldKey);
        var cssClass = colOpts.cssClass;
        var datatype = field.getDatatype();
        var filterable = columnManager.filterable
                         && (((colOpts.filterable != undefined) && (colOpts.filterable != null))
                              ? colOpts.filterable : columnManager.filterable);

        // We're extending the column properties a little here.
        var columnProperties =
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
    //      filterable: colOpts.filterable,
          unit: field.getUnit(),
          utype: field.getUType(),
          filterable: filterable
        };

        // Default is to be sortable.
        columnProperties.sortable =
          ((colOpts.sortable != null) && (colOpts.sortable != undefined))
              ? colOpts.sortable : true;

        if (datatype)
        {
          columnProperties.datatype = datatype;
        }

        columnProperties.header = colOpts.header;

        if (forceFitMax)
        {
          columnProperties.width = getOptions().defaultColumnWidth;
        }
        else if (!columnManager.forceFitColumns)
        {
          if (colOpts.width)
          {
            columnProperties.width = colOpts.width;
          }
          // Here to handle XTypes like the adql:timestamp xtype.
          else if (field.getXType() && field.getXType().match(/timestamp/i))
          {
            columnProperties.width = 140;
          }
        }

        addColumn(columnProperties);
      });
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
      for (var columnId in filters)
      {
        var filterValue = filters[columnId];
        var grid = args.grid;
        if ((columnId !== undefined) && (filterValue !== ""))
        {
          var column =
              grid.getColumns()[grid.getColumnIndex(columnId)];
          var cellValue = item[column.field];
          var rowID = item["id"];
          var columnFormatter = column.formatter;

          // Reformatting the cell value could potentially be quite exensive!
          // This may require some re-thinking.
          // jenkinsd 2013.04.30
          if (columnFormatter)
          {
            var cell = grid.getColumnIndex(column.id);
            var row = this.getIdxById(rowID);
            var formattedCellValue =
                columnFormatter(row, cell, cellValue, column, item);

            cellValue = formattedCellValue && $(formattedCellValue).text
                ? $(formattedCellValue).text() : formattedCellValue;
          }

          filterValue = $.trim(filterValue);
          var negate = filterValue.indexOf("!") == 0;

          if (negate)
          {
            filterValue = filterValue.substring(1);
          }

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
      var allRows = table.getTableData().getRows().slice(0);

      $.each(allRows, function (rowIndex, row)
      {
        var d = {};

        d["id"] = row.getID();
        $.each(row.getCells(), function (cellIndex, cell)
        {
          var cellFieldID = cell.getField().getID();
          d[cellFieldID] = cell.getValue();
        });

        addRow(d, rowIndex);
      });
    }

    function render()
    {
      var dataView = getDataView();
      var grid = getGrid();

      // initialize the model after all the events have been hooked up
      dataView.beginUpdate();
      dataView.setItems(getGridData());
      dataView.setFilterArgs({
                               columnFilters: getColumnFilters(),
                               grid: getGrid(),
                               doFilter: valueFilters
                             });
      dataView.setFilter(searchFilter);
      dataView.endUpdate();

      if (grid.getSelectionModel())
      {
        // If you don't want the items that are not visible (due to being filtered out
        // or being on a different page) to stay selected, pass 'false' to the second arg
        dataView.syncGridSelection(grid, true);
      }

      var gridContainer = $(getTargetNodeSelector());

      if (gridContainer.resizable && getOptions().gridResizable)
      {
        gridContainer.resizable();
      }

      grid.init();
    }

    $.extend(this,
             {
               "init": init,
               "build": build,
               "render": render,
               "load": load,
               "areNumbers": areNumbers,
               "areStrings": areStrings,
               "getOptions": getOptions,
               "refreshGrid": refreshGrid,
               "getGrid": getGrid,
               "getDataView": getDataView,
               "getColumn": getColumn,
               "getSelectedRows": getSelectedRows,
               "getRow": getRow,
               "clearColumnFilters": clearColumnFilters,
               "getColumnFilters": getColumnFilters,
               "setDisplayColumns": setDisplayColumns,
               "valueFilters": valueFilters,
               "searchFilter": searchFilter
             });
  }
})(jQuery);
