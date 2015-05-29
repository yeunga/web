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
   * New Dialog column picker.
   *
   * @param _columns   The columns to put.
   * @param _grid      The underlying Grid.
   * @param _$panel     The container to put the link/button in.
   * @param _options   Optional items.
   * @constructor
   */
  function DialogColumnPicker(_columns, _grid, _$panel, _options)
  {
    var selfColumnPicker = this;

    this.options = $.extend({}, cadc.vot.picker.defaultOptions, _options);

    // Cached value to reset to.
    this.originalColumns = _grid.getColumns();

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
    this.$panel = _$panel;
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
      selfColumnPicker.$target.append("<div class='clear'></div>")

      selfColumnPicker.$dialog.find(".column_manager_columns").
          append(selfColumnPicker.$selectedItems).
          append($("<div class='span-1'></div>")).
          append(selfColumnPicker.$availableItems);

      selfColumnPicker.$dialog.on("popupbeforeposition", function (event, ui)
      {
        buildMenu(event);
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
          });

      $resetSpan.click(function ()
                       {
                         setColumns(selfColumnPicker.originalColumns.slice(0));
                         trigger(cadc.vot.picker.events.onResetColumnOrder, null, null);
                       });

      $showAllSpan.click(function ()
                         {
                           var colIDs = [];
                           var gridCols = selfColumnPicker.grid.getColumns().slice(0);
                           var allCols = [];

                           $.each(gridCols, function (gcKey, gColDef)
                           {
                             colIDs.push(gColDef.id);
                             allCols.push(gColDef);
                           });

                           $.each(selfColumnPicker.allColumns, function (colKey, colDef)
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
                           trigger(cadc.vot.picker.events.onShowAllColumns, null, null);
                         });

      $orderAlphaSpan.click(function (e)
                            {
                              var arr =
                                  selfColumnPicker.grid.getColumns().slice(0);
                              arr.sort(function (o1, o2)
                                       {
                                         var lowerO1Name =
                                             o1.name.toLowerCase();
                                         var lowerO2Name =
                                             o2.name.toLowerCase();
                                         return lowerO1Name > lowerO2Name
                                             ? 1 : lowerO1Name < lowerO2Name
                                                    ? -1 : 0;
                                       });

                              setColumns(arr);
                              trigger(cadc.vot.picker.events.onSortAlphabetically,
                                      null, null);
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
    function addColumns()
    {
      // Displayed columns.
      var gridColumns = selfColumnPicker.grid.getColumns();

      for (var gi = 0, gl = gridColumns.length; gi < gl; gi++)
      {
        var $selectedItemDOM = createColumnDOM(gridColumns[gi], true);
        selfColumnPicker.$selectedItems.append($selectedItemDOM);
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
        var $availableItemDOM = createColumnDOM(availableCols[i], false);
        selfColumnPicker.$availableItems.append($availableItemDOM);
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

      // Omit the checkbox column.
      if (_col.id == cadc.vot.picker.CHECKBOX_ID)
      {
        $li.addClass("ui-state-disabled");
        selfColumnPicker.$selectedItems.append($li);
      }
      else
      {
        var $input = $("<input type='checkbox' id='column-picker-" + _col.id
                       + "' name='column-picker-"+ _col.id + "' />").
            data("column-id", _col.id);

        $input.prop("checked", __isDisplayed);

        // Occurs after the actual checkbox is checked.
        $input.change(function ()
                     {
                       var $checkbox = $(this);
                       var $listItem = $checkbox.parent().parent();

                       if ($checkbox.checked)
                       {
                         selfColumnPicker.$availableItems.remove($listItem);
                         selfColumnPicker.$selectedItems.append($listItem);
                       }
                       else
                       {
                         selfColumnPicker.$selectedItems.remove($listItem);
                         selfColumnPicker.$availableItems.append($listItem);
                       }

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
    }

    /**
     * Construct the unordered list of items.
     * @param e   An event to pass in.  Optional.
     */
    function buildMenu(e)
    {
      selfColumnPicker.$selectedItems.empty();
      selfColumnPicker.$availableItems.empty();

      addColumns();

      if (e)
      {
        selfColumnPicker.$panel.css("top", e.pageY).css("left", e.pageX);
      }
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
      args.grid = grid;
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
            $.each(columns, function (cI, cO)
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
