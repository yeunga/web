(function ($)
{
  $.extend(true, window,
      {
        "cadc": {
          "vot": {
            "picker": {
              "CHECKBOX_ID": "_checkbox_selector",
              "TARGET_SELECTOR_OPTION_KEY": "targetSelector",
              "DIALOG_TRIGGER_ID_OPTION_KEY": "dialogTriggerID",
              "DIALOG_CLOSE_SELECTOR_KEY": "closeDialogSelector",
              "DialogColumnPicker": DialogColumnPicker,
              "defaultOptions": {
                fadeSpeed: 250,
                linkText: "More columns...",
                dialogButtonID: "slick-columnpicker-panel-change-column",

                // Options for the dialog
                modal: true,
                autoOpen: false,
                closeDialogSelector: ".dialog_close"
              },
              "defaultSortableOptions": {
                // Options for the sortable menus.
                helper: 'clone',
                opacity: 0.8,
                refreshPositions: true,
                cancel: ".ui-state-disabled"
              },
              "events": {
                "onColumnPickerInit": new Slick.Event(),
                "onColumnAddOrRemove": new Slick.Event(),
                "onSort": new Slick.Event(),
                "onResetColumnOrder": new Slick.Event(),
                "onShowAllColumns": new Slick.Event(),
                "onSortAlphabetically": new Slick.Event()
              }
            }
          }
        }
      });


  /**
   * New Dialog column picker.  To reduce complexity, it's practice here to
   * ensure the menu lists are updated first, then the refresh process will
   * use that to then set the columns.
   *
   * @param _columns   The columns to put.
   * @param _grid      The underlying Grid.
   * @param _options   Optional items.
   * @constructor
   */
  function DialogColumnPicker(_columns, _grid, _options)
  {
    var selfColumnPicker = this;

    this.options = $.extend({}, cadc.vot.picker.defaultOptions, _options);

    // Cached value to reset to.
    this.originalColumns = _grid.getColumns();
    this.checkboxColumn = selfColumnPicker.originalColumns[0];

    this.$dialog = $("#column_manager_container");
    this.$selectedItems =
        $("<ul class='slick-columnpicker slick-columnpicker-tooltip' />").
            attr("id", "cadc_columnpicker_selected_items").
            addClass("row-start").addClass("span-3");
    this.$availableItems =
        $("<ul class='slick-columnpicker slick-columnpicker-tooltip' />").
            attr("id", "cadc_columnpicker_available_items").
            addClass("row-end").addClass("span-3");
    this.grid = _grid;
    this.allColumns = _columns;
    this.$target = $(getOption(cadc.vot.picker.TARGET_SELECTOR_OPTION_KEY));


    /**
     * Initialize this column picker.
     */
    function init()
    {
      var $buttonHolder =
          $("<div class='slick-column-picker-tooltip-button-holder span-3'></div>")
              .appendTo(selfColumnPicker.$target);
      selfColumnPicker.$target.append("<div class='clear'></div>").
          append("<hr />");
      var $showAllSpan =
          $("<span class='slick-column-picker-button'>Show all columns</span>")
              .appendTo($buttonHolder);
      var $resetSpan =
          $("<span class='slick-column-picker-button'>Reset column order</span>")
              .appendTo($buttonHolder);
      var $orderAlphaSpan =
          $("<span class='slick-column-picker-button'>Order alphabetically</span>")
              .appendTo($buttonHolder);

      // Clear before the menus.
      selfColumnPicker.$target.append("<div class='clear'></div>");

      selfColumnPicker.$dialog.find(".column_manager_columns").
          append(selfColumnPicker.$selectedItems).
          append($("<div class='span-1'></div>")).
          append(selfColumnPicker.$availableItems);

      selfColumnPicker.$dialog.on("popupbeforeposition", function ()
      {
        buildMenus();
      });

      /**
       * Function issued when the jQuery UI's Sortable menu feature has ended.
       */
      var onDrop = function (event, ui)
      {
        var $liItem = $(ui.item[0]);
        var itemChecked =
            (ui.sender[0].id === selfColumnPicker.$availableItems.attr("id"));
        $liItem.find("input[id='column-picker-" + $liItem.data("column-id")
                     + "']").prop("checked", itemChecked);
        refreshColumns();
      };

      var selectedItemsOptions =
          $.extend({},
              {
                "connectWith": "#" +
                               selfColumnPicker.$availableItems.attr("id"),
                "receive": onDrop,
                "appendTo": selfColumnPicker.$dialog
              },
              cadc.vot.picker.defaultSortableOptions);
      var availableItemsOptions =
          $.extend({},
              {
                "connectWith": "#" +
                               selfColumnPicker.$selectedItems.attr("id"),
                "receive": onDrop,
                "appendTo": selfColumnPicker.$dialog
              },
              cadc.vot.picker.defaultSortableOptions);

      selfColumnPicker.$selectedItems.sortable(selectedItemsOptions);
      selfColumnPicker.$availableItems.sortable(availableItemsOptions);

      selfColumnPicker.$dialog.find(
          getOption(cadc.vot.picker.DIALOG_CLOSE_SELECTOR_KEY)).click(
          function ()
          {
            selfColumnPicker.$dialog.popup("close");
            return false;
          });


      /*
       *************************************
       *
       * Top button handling.
       *
       *************************************
       */
      $resetSpan.click(function ()
                       {
                         // Setup the grid first, then rebuild the menus.
                         setColumns(selfColumnPicker.originalColumns.slice(0));
                         buildMenus();

                         //trigger(cadc.vot.picker.events.onResetColumnOrder,
                         //        null, null);

                         return false;
                       });

      $showAllSpan.click(function ()
                         {
                           var colIDs = [];
                           var gridCols =
                               selfColumnPicker.grid.getColumns().slice(0);
                           var allCols = [];

                           $.each(gridCols, function (gcKey, gColDef)
                           {
                             colIDs.push(gColDef.id);
                             allCols.push(gColDef);
                           });

                           $.each(selfColumnPicker.allColumns,
                                  function (colKey, colDef)
                                  {
                                    var colID = colDef.id;
                                    var isInGrid = false;

                                    $.each(colIDs, function (ccKey, cColID)
                                    {
                                      if (cColID == colID)
                                      {
                                        isInGrid = true;
                                        return false;
                                      }
                                    });

                                    if (!isInGrid)
                                    {
                                      allCols.push(colDef);
                                    }
                                  });

                           setColumns(allCols);
                           buildMenus();

                           trigger(cadc.vot.picker.events.onShowAllColumns,
                                   null, null);

                           return false;
                         });

      $orderAlphaSpan.click(
          function ()
          {
            // Slice at index 1 to omit the checkbox column.  We'll add it in
            // later.
            var arr =
                new cadc.web.util.Array(
                    selfColumnPicker.grid.getColumns().slice(1));
            var sortedArray = arr.sort("name");

            sortedArray.splice(0, 0, selfColumnPicker.checkboxColumn);

            setColumns(sortedArray);
            buildMenus();

            trigger(cadc.vot.picker.events.onSortAlphabetically,
                    null, null);

            return false;
          });

      selfColumnPicker.$availableItems.disableSelection();
      selfColumnPicker.$selectedItems.disableSelection();
    }

    /**
     * Using the set of selected menu items, refresh the grid's columns.
     */
    function refreshColumns()
    {
      selfColumnPicker.$availableItems.sortable("refresh");
      selfColumnPicker.$selectedItems.sortable("refresh");

      var $liItems = selfColumnPicker.$selectedItems.find("li");
      var newColumns = [];

      // Always first.
      newColumns.push(selfColumnPicker.checkboxColumn);

      for (var sii = 0, sil = $liItems.length; sii < sil; sii++)
      {
        var $liItem = $($liItems[sii]);
        var columnID = $liItem.data("column-id");
        newColumns.push(getColumn(columnID));
      }

      setColumns(newColumns);
    }

    function getOption(_key)
    {
      return selfColumnPicker.options.hasOwnProperty(_key)
          ? selfColumnPicker.options[_key] : null;
    }

    /**
     * Obtain the column object for the given column ID.
     * @param _colID    The ID of the column to look for.
     *
     * @return {Object} Column object.
     */
    function getColumn(_colID)
    {
      for (var aci = 0, acl = selfColumnPicker.allColumns.length; aci < acl;
           aci++)
      {
        var nextColumn = selfColumnPicker.allColumns[aci];
        if (nextColumn.id == _colID)
        {
          return nextColumn;
        }
      }

      return null;
    }

    /**
     * Build the columns menus.
     **/
    function addMenuItems()
    {
      // Displayed columns.
      var gridColumns = selfColumnPicker.grid.getColumns();

      for (var gi = 0, gl = gridColumns.length; gi < gl; gi++)
      {
        var nextSelectedColumn = gridColumns[gi];

        if (nextSelectedColumn.id != cadc.vot.picker.CHECKBOX_ID)
        {
          selfColumnPicker.$selectedItems.append(
              createColumnDOM(nextSelectedColumn, true));
        }
      }

      // Get the rest.
      var availableCols = new cadc.web.util.Array(selfColumnPicker.allColumns).
          subtract(function (element/*, index, array*/)
                   {
                     for (var ii = 0, gcl = gridColumns.length; ii < gcl; ii++)
                     {
                       if (gridColumns[ii].id == element.id)
                       {
                         return false;
                       }
                     }

                     return true;
                   });

      for (var i = 0, l = availableCols.length; i < l; i++)
      {
        var nextAvailableColumn = availableCols[i];

        // Should never happen since the checkbox column is never not in the
        // 'selected' menu list, but here we are anyway.
        if (nextAvailableColumn.id != cadc.vot.picker.CHECKBOX_ID)
        {
          selfColumnPicker.$availableItems.append(
              createColumnDOM(nextAvailableColumn, false));
        }
      }
    }

    /**
     * Append the given column to the appropriate DOM menu.
     * @param _col           The column object.
     * @param __isDisplayed  Whether the given column is displayed or not.
     */
    function createColumnDOM(_col, __isDisplayed)
    {
      var $li = $("<li class=\"ui-state-default\"></li>");
      $li.prop("id", "ITEM_" + _col.id);
      $li.data("column-id", _col.id);

      var $input = $("<input type='checkbox' id='column-picker-" + _col.id
                     + "' name='column-picker-" + _col.id + "' />").
          data("column-id", _col.id);

      $input.prop("checked", __isDisplayed);

      // Occurs after the actual checkbox is modified (changed).
      $input.change(function ()
                    {
                      var $listItem = $(this).parent().parent();

                      // Add the clone to its destination.
                      $listItem.appendTo((this.checked)
                                             ? selfColumnPicker.$selectedItems
                                             :
                                         selfColumnPicker.$availableItems);

                      // Refresh the list.
                      refreshColumns();
                    });

      var $columnLabel =
          $("<div class='slick-column-picker-label-text'></div>").text(
              _col.name);
      $columnLabel.prop("id", "LABEL_" + _col.id);

      $columnLabel.prepend($input);
      $columnLabel.appendTo($li);

      return $li;
    }

    /**
     * Construct the unordered list of items.
     */
    function buildMenus()
    {
      selfColumnPicker.$selectedItems.empty();
      selfColumnPicker.$availableItems.empty();

      addMenuItems();
    }

    /**
     * Fire an event.  Taken from the slick.grid Object.
     *
     * @param evt     The Event to fire.
     * @param args    Arguments to the event.
     * @param e       Event data.
     * @returns {*}   The event notification result.
     */
    function trigger(evt, args, e)
    {
      e = e || new Slick.EventData();
      args = args || {};
      //args.grid = selfColumnPicker.grid;
      return evt.notify(args, e, selfColumnPicker);
    }

    function updateColumns()
    {
      trigger(cadc.vot.picker.events.onSort,
          {
            "visibleColumns": selfColumnPicker.grid.getColumns()
          }, null);

      trigger(cadc.vot.picker.events.onColumnAddOrRemove,
          {
            "visibleColumns": selfColumnPicker.grid.getColumns()
          }, null);
    }

    /**
     * Commit the given columns to the grid.
     * @param _cols   The array of columns.
     */
    function setColumns(_cols)
    {
      selfColumnPicker.grid.setColumns(_cols);
    }


    $.extend(this,
        {
          "updateColumnData": function (_colID, _dataKey, _dataObject)
          {
            $.each(selfColumnPicker.allColumns, function (cI, cO)
            {
              if (cO.id == _colID)
              {
                $(cO).data(_dataKey, _dataObject);
              }
            });

            selfColumnPicker.updateColumns();
          },
          "updateColumns": updateColumns
        });

    init();
  }

})(jQuery);
