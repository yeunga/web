/**
 * CADC VOTable viewer plugin to hook into the filter input boxes to suggest
 * data from the grid as the user types.
 *
 * @param _viewer     The cadc.vot.Viewer object containing data.
 *
 * jenkinsd 2014.12.01
 */
(function ($)
{
  // register namespace
  $.extend(true, $.fn, {
    "cadcVOTV_filter_suggest": cadcVOTV_filter_suggest
  });

  /**
   * Make use of autocomplete suggestions on filtering.
   *
   * @param _viewer     The VOTable viewer object.
   * @constructor
   */
  function cadcVOTV_filter_suggest(_viewer)
  {
    var $inputField = $(this);
    var suggestionKeys = [];
    var columnID = $inputField.data("columnId");

    /**
     * Ensure unique values in an array.
     *
     * @param value       A value to check.
     * @param index       The index of the current value.
     * @param self        This array.
     * @returns {boolean} If it needs to be omitted.
     */
    function onlyUnique(value, index, self)
    {
      return self.indexOf(value) === index;
    }

    $inputField.on("change keyup", function(e)
    {
      var inputVal = $inputField.val();
      var trimmedVal = $.trim(inputVal);
      var space = " ";

      // Ends with space, so exact match.
      if (inputVal.indexOf(space, (inputVal.length - space.length)) !== -1)
      {
        $inputField.autocomplete("close");
        _viewer.doFilter(trimmedVal, columnID);
      }
      // Clear it if the input is cleared.
      else if (!trimmedVal || (trimmedVal === ''))
      {
        _viewer.doFilter("", columnID);
      }
    });

    $inputField.autocomplete({
                               // Define the minimum search string length
                               // before the suggested values are shown.
                               minLength: 1,

                               // Define callback to format results
                               source: function (req, callback)
                               {
                                 var column = _viewer.getColumn(columnID);
                                 var enteredValue = req.term;
                                 var regex =
                                     new RegExp($.ui.autocomplete.escapeRegex(enteredValue),
                                                "gi");

                                 // Reset each time as they type.
                                 suggestionKeys = [];

                                 $.each(_viewer.getDataView().getItems(),
                                        function(idx, item)
                                        {
                                          var nextVal = item[column.id];

                                          if (nextVal)
                                          {
                                            var nextStringVal =
                                                nextVal.toString();

                                            if (nextStringVal.match(regex))
                                            {
                                              suggestionKeys.push(
                                                  nextStringVal);
                                            }
                                          }
                                        });

                                 callback(suggestionKeys.filter(onlyUnique));
                               },
                               select: function (event, ui)
                               {
                                 var trimmedVal = $.trim(ui.item.value);
                                 _viewer.doFilter((trimmedVal || ""), columnID);
                               }
                             });

    return this;
  }
})(jQuery);

