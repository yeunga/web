(function ($)
{
  if (typeof A === "undefined")
  {
    // Require AladinLite.
    throw new Error("AladinLite must be present.  (http://aladin.u-strasbg.fr/AladinLite/)");
  }

  // register namespace
  $.extend(true, window, {
    "cadc": {
      "vot": {
        "plugin": {
          "footprint": AladinLiteFootprintViewer,
          "events": {
            "onToggleOpen": new jQuery.Event
          }
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
    var PI_OVER_180 = Math.PI / 180.0;
    var DEG_PER_ARC_SEC = 1.0 / 3600.0;

    var _self = this;
    var _defaults = {
      targetSelector: "#aladin-lite",
      toggleSwitchSelector: null,     // Always show by default.
      toggleOpen: function() {},
      toggleClose: function() {},
      footprintFieldID: "footprint",
      raFieldID: "ra",
      decFieldID: "dec",
      fovFieldID: "fov",
      fov: null,
      onHover: true,
      onClick: true,
      coords: [1000, -1000, 0, 0]
    };

    this.grid = null;
    this.handler = new Slick.EventHandler();

    var inputs = $.extend(true, {}, _defaults, _inputs);

    this.footprintFieldID = inputs.footprintFieldID;
    this.raFieldID = inputs.raFieldID;
    this.decFieldID = inputs.decFieldID;
    this.fovFieldID = inputs.fovFieldID;
    this.$target = $(inputs.targetSelector);

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

      if (inputs.toggleSwitchSelector != null)
      {
        _self.$target.hide();
        $(inputs.toggleSwitchSelector).on("click", function (e)
        {
          e.preventDefault();

          _self.$target.toggle();

          if (_self.$target.is(":visible"))
          {
            inputs.toggleOpen($(this), _self.$target);
          }
          else
          {
            inputs.toggleClose($(this), _self.$target);
          }

          return false;
        });
      }

      _self.grid = grid;
      _self.aladin = A.aladin(inputs.targetSelector);
      _self.aladinOverlay = A.graphicOverlay({color: "orange", lineWidth: 3});
      _self.aladin.addOverlay(_self.aladinOverlay);

      if (inputs.fov != null)
      {
        _self.aladin.setFoV(inputs.fov);
      }

      _self.handler.subscribe(_self.grid.onRenderComplete, handleRenderComplete);

      if (inputs.onHover === true)
      {
        _self.handler.subscribe(_self.grid.onMouseEnter, handleMouseEnter)
      }

      if (inputs.onClick === true)
      {
        _self.handler.subscribe(_self.grid.onClick, handleClick);
      }

      // define function triggered when an object is clicked
      var objClicked;
      _self.aladin.on('objectClicked', function(object)
      {
        var msg;
        if (object)
        {
          objClicked = object;
          object.select();
          msg = 'You clicked object ' + object.data.name + ' located at '
                + object.ra + ', ' + object.dec;
        }
        else
        {
          objClicked.deselect();
          msg = 'You clicked in void';
        }
        $('#wb-cont').html(msg);
      });
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

      if (inputs.toggleSwitchSelector != null)
      {
        $(inputs.toggleSwitchSelector).off("click");
      }
    }

    function _handleAction(_dataRow)
    {
      var raValue = _dataRow[_self.raFieldID];
      var decValue = _dataRow[_self.decFieldID];

      if (raValue && decValue)
      {
        _self.aladin.gotoRaDec(raValue, decValue);
      }
    }

    function handleClick(e, args)
    {
      _handleAction(args.grid.getDataItem(args.row));
    }

    function handleMouseEnter(e, args)
    {
      _handleAction(args.grid.getDataItem(args.cell.row));
    }

    function handleRenderComplete(e, args)
    {
      resetOverlay();

      var polygonSplit = "Polygon ICRS";
      var renderedRange = args.grid.getRenderedRange();

      // For FOV computation.
      var DEC = _defaults.coords;
      var RA0 = _defaults.coords;
      var RA180 = _defaults.coords;

      // Start at this location.
      var defaultRA = null;
      var defaultDec = null;

      for (var i = renderedRange.top, ii = renderedRange.bottom; i < ii; i++)
      {
        var $nextRow = args.grid.getDataItem(i);
        var polygonValue = $nextRow[_self.footprintFieldID];
        var raValue = $nextRow[_self.raFieldID];
        var decValue = $nextRow[_self.decFieldID];

        // Set the default location to the first item we see.
        if ((defaultRA == null) && (raValue != null) && ($.trim(raValue) != ""))
        {
          defaultRA = raValue;
        }

        if ((defaultDec == null) && (decValue != null) && ($.trim(decValue) != ""))
        {
          defaultDec = decValue;
        }

        var halfFOV = 0.5 * DEG_PER_ARC_SEC * $nextRow[_self.fovFieldID];

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

                if (inputs.fov == null)
                {
                  var mi = decValue - halfFOV;
                  var ma = decValue + halfFOV;

                  if (DEC[0] > mi)
                  {
                    DEC[0] = mi;
                  }

                  if (DEC[1] < ma)
                  {
                    DEC[1] = ma;
                  }

                  mi = (((raValue - halfFOV) + 360.0 ) % 360.0);
                  ma = (((raValue + halfFOV) + 360.0 ) % 360.0);

                  if (RA0[0] > mi)
                  {
                    RA0[0] = mi;
                  }

                  if (RA0[1] < ma)
                  {
                    RA0[1] = ma;
                  }

                  mi = (mi + 180.0) % 360.0;
                  ma = (ma + 180.0) % 360.0;

                  if (RA180[0] > mi)
                  {
                    RA180[0] = mi;
                  }

                  if (RA180[1] < ma)
                  {
                    RA180[1] = ma;
                  }
                }
              }
            }
          }
        }
      }

      if (inputs.fov == null)
      {
        RA0[2] = (0.5 * (RA0[0] + RA0[1] ));
        RA0[3] = (RA0[1] - RA0[0]);

        RA180[2] = (0.5 * (RA180[0] + RA180[1] ));
        RA180[3] = (RA180[1] - RA180[0]);

        DEC[2] = (0.5 * (DEC[0] + DEC[1] ));
        DEC[3] = (DEC[1] - DEC[0]);

        var aRA = RA0.slice(0);

        if (RA0[3] > RA180[3])
        {
          RA180[0] = ((RA180[0] + 180.0) % 360.0);
          RA180[1] = ((RA180[1] + 180.0) % 360.0);
          RA180[2] = ((RA180[2] + 180.0) % 360.0);

          aRA = RA180.slice(0);
        }

        // Add 20% to add some space around the footprints
        _self.aladin.setFoV(Math.max(DEC[3], (aRA[3] * Math.cos(DEC[2]
                            * PI_OVER_180))) * 1.2);
      }

      if ((defaultRA != null) && (defaultDec != null))
      {
        _self.aladin.gotoRaDec(defaultRA, defaultDec);
      }
    }

    $.extend(this, {
      "init": init,
      "destroy": destroy
    });
  }
})(jQuery);