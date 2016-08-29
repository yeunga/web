(function ($)
{
  // Load the AladinLite viewer ONLY if not already done so (useful for
  // QUnit tests.).
  //if (typeof A === "undefined")
  //{
  //  // Enable the AladinLite viewer.
  //  $.getScript("/cadcVOTV/javascript/aladin.js");
  //}

  // register namespace
  $.extend(true, window, {
    "cadc": {
      "vot": {
        "plugin": {
          "footprint": AladinLiteFootprintViewer
        }
      }
    }
  });


  /**
   * AladinLite footprint viewer.  This is incorporated as a Plugin to allow
   *
   * @constructor
   */
  function AladinLiteFootprintViewer(_inputs)
  {
    var _self = this;
    var _defaults = {
      targetSelector: "#aladin-lite",
      toggleSwitchSelector: null,
      footprintFieldID: "footprint",
      raFieldID: "ra",
      decFieldID: "dec",
      coords: [1000, -1000, 0, 0]
    };

    this.grid = null;
    this.handler = new Slick.EventHandler();

    var inputs = $.extend(true, {}, _defaults, _inputs);

    this.footprintFieldID = inputs.footprintFieldID;
    this.raFieldID = inputs.raFieldID;
    this.decFieldID = inputs.decFieldID;
    this.$target = $(inputs.targetSelector);

    if (inputs.toggleSwitchSelector != null)
    {
      _self.$target.hide();
      $(inputs.toggleSwitchSelector).on("click", function (e)
      {
        e.preventDefault();

        _self.$target.toggle();

        return false;
      });
    }

    //
    // Declare AladinLite
    //
    this.aladin = null;

    // footprint overlay, public data
    this.aladinOverlay = null;

    //
    // End declaration of AladinLite
    //

    /**
     * Initialize with the Slick Grid instance.
     * @param grid{Slick.Grid}      The Slick Grid instance.
     */
    function init(grid)
    {
      destroy();

      _self.grid = grid;
      _self.aladin = A.aladin(inputs.targetSelector, {fov: 120});
      _self.aladinOverlay = A.graphicOverlay({color: "orange", lineWidth: 3});
      _self.aladin.addOverlay(_self.aladinOverlay);
      _self.handler.subscribe(_self.grid.onMouseEnter, handleMouseEnter)
        .subscribe(_self.grid.onRenderComplete, handleRenderComplete);
    }

    function resetOverlay()
    {
      _self.aladinOverlay.removeAll();
    }

    function destroy()
    {
      _self.handler.unsubscribeAll();
      _self.aladin = null;
      _self.aladinOverlay = null;
      _self.$target.empty();
    }

    function handleMouseEnter(e, args)
    {
      var dataRow = args.grid.getDataItem(args.cell.row);

      var raValue = dataRow[_self.raFieldID];
      var decValue = dataRow[_self.decFieldID];

      if (raValue && decValue)
      {
        _self.aladin.gotoRaDec(raValue, decValue);
      }
    }

    function handleRenderComplete(e, args)
    {
      resetOverlay();

      var polygonSplit = "Polygon ICRS";
      var renderedRange = args.grid.getRenderedRange();
      for (var i = renderedRange.top, ii = renderedRange.bottom; i < ii; i++)
      {
        var $nextRow = args.grid.getDataItem(i);
        var polygonValue = $nextRow[_self.footprintFieldID];

        if (polygonValue != null)
        {
          var footprintValues = polygonValue.split(polygonSplit);
          var footprintValuesLength = footprintValues.length;

          for (var fpvi = 0; fpvi < footprintValuesLength; fpvi++)
          {
            var nextFootprint = footprintValues[fpvi];

            if ((nextFootprint != null) && ($.trim(nextFootprint).length > 0))
            {
              var footprintElements = nextFootprint.split(/\s/);

              for (var fei = 0, fel = footprintElements.length; fei < fel;
                   fei++)
              {
                var footprintElement = footprintElements[fei];

                if (isNaN(footprintElement))
                {
                  delete footprintElements[fei];
                }
              }

              if (footprintElements.length > 0)
              {
                nextFootprint = polygonSplit + footprintElements.join(" ");

                _self.aladinOverlay.addFootprints(
                  _self.aladin.createFootprintsFromSTCS(nextFootprint));
              }
            }
          }
        }
      }
    }

    $.extend(this, {
      "init": init,
      "destroy": destroy
    });
  }
})(jQuery);