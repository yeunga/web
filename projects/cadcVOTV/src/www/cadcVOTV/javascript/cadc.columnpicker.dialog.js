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
                closeDialogSelector: ".dialog_close",

                // Options for the sortable menus.
                opacity: 0.8,
                containment: "parent",
                tolerance: "pointer",
                axis: "y",
                helper: "original"
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
      selfColumnPicker.$dialog.find(".column_manager_columns").
          append(selfColumnPicker.$selectedItems).
          append($("<div class='span-1'></div>")).
          append(selfColumnPicker.$availableItems);

      selfColumnPicker.$dialog.on("popupbeforeposition", function (event, ui)
        {
          buildMenu(event);
        });

      selfColumnPicker.$selectedItems.sortable({
        connectWith: selfColumnPicker.$availableItems.attr("id")
      });

      selfColumnPicker.$availableItems.sortable({
        connectWith: selfColumnPicker.$selectedItems.attr("id")
      });

      selfColumnPicker.$dialog.find(
          getOption(cadc.vot.picker.DIALOG_CLOSE_SELECTOR_KEY)).click(function(e)
      {
        selfColumnPicker.$dialog.popup("close");
      });

      selfColumnPicker.$selectedItems.on("sortstart", function (event, ui)
      {
        ui.helper.css('margin-top', $(window).scrollTop());
      }).on("sortbeforestop", function (event, ui)
      {
        ui.helper.css('margin-top', 0);
      });

      selfColumnPicker.$availableItems.on("sortstart", function (event, ui)
      {
        ui.helper.css('margin-top', $(window).scrollTop());
      }).on("sortbeforestop", function (event, ui)
      {
        ui.helper.css('margin-top', 0);
      });

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

      selfColumnPicker.$target.append(selfColumnPicker.$selectedItems);

      selfColumnPicker.$target.append(selfColumnPicker.$availableItems);

      $resetSpan.click(function (e)
      {
        setColumns(selfColumnPicker.originalColumns.slice(0), e);
        trigger(selfColumnPicker.onResetColumnOrder, null, null);
      });

      $showAllSpan.click(function (e)
      {
        var colIDs = [];
        var gridCols = selfColumnPicker.grid.getColumns().slice(0);
        var allCols = [];

        $.each(gridCols, function (gcKey, gColDef)
        {
          colIDs.push(gColDef.id);
          allCols.push(gColDef);
        });

        $.each(self.allColumns, function (colKey, colDef)
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
        trigger(selfColumnPicker.onShowAllColumns, null, null);
      });

      $orderAlphaSpan.click(function (e)
      {
        var arr = grid.getColumns().slice(0);
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
        trigger(selfColumnPicker.onSortAlphabetically, null, null);
      });

      selfColumnPicker.$availableItems.disableSelection();
      selfColumnPicker.$selectedItems.disableSelection();
    }

    function refresh(event)
    {
      grid.invalidate();
      grid.resizeCanvas();
      buildMenu(event);
      refreshMenus();
    }

    function refreshMenus()
    {
      selfColumnPicker.$availableItems.sortable("refresh");
      selfColumnPicker.$selectedItems.sortable("refresh");
    }

    function getOption(_key)
    {
      return selfColumnPicker.options.hasOwnProperty(_key)
          ? selfColumnPicker.options[_key] : null;
    }

    /**
     * Build the selected columns menu.
     *
     * @param _cols       The selected column objects.
     */
    function addColumns(_cols)
    {
      for (var i = 0, l = _cols.length; i < l; i++)
      {
        var nextCol = _cols[i];
        appendColumnItem(nextCol);
      }
    }

    /**
     * Append the given column to the appropriate DOM menu.
     * @param _col    The column object.
     */
    function appendColumnItem(_col)
    {
      var displayedColumnIndex = selfColumnPicker.grid.getColumnIndex(_col.id);
      var isDisplayedColumn =
          displayedColumnIndex && (displayedColumnIndex >= 0);
      var $menu = isDisplayedColumn ? selfColumnPicker.$selectedItems
          : selfColumnPicker.$availableItems;

      var $li = $("<li class=\"ui-state-default\"></li>").appendTo($menu);
      $li.prop("id", "ITEM_" + _col.id);
      $li.data("column-id", _col.id);

      // Omit the checkbox column.
      if (_col.id == cadc.vot.CHECKBOX_ID)
      {
        $li.hide();
      }
      else
      {
        var $input = $("<input type='checkbox' name='column-picker-"
                       + _col.id + "' />").data("column-id", _col.id);

        // Occurs after the actual checkbox is checked.
        $input.change(function (e)
        {
          var $checkbox = $(this);
          var $listItem = $checkbox.parent().parent();

          $listItem.remove();

          // Refresh the list.
          refreshMenus();
          updateColumns();
        });

        $input.prop("checked", isDisplayedColumn);

        var $columnLabel =
            $("<div class='slick-column-picker-label-text'></div>").text(
                _col.name);
        $columnLabel.prop("id", "LABEL_" + _col.id);

        $columnLabel.prepend($input);
        $columnLabel.appendTo($li);
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

      addColumns(selfColumnPicker.allColumns);

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
            "visibleColumns": visibleColumns
          }, null);

      trigger(cadc.vot.picker.events.onColumnAddOrRemove,
          {
            "visibleColumns": visibleColumns
          }, null);
    }

    function setColumns(_cols, _event)
    {
      selfColumnPicker.grid.setColumns(_cols);
      refresh(_event);
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
