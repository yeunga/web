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
    "cadcVOTV_filter_default": cadcVOTV_filter_default
  });

  /**
   * Default filter for the Grid results.
   *
   * @param _viewer       The VOTable viewer object.
   * @constructor
   */
  function cadcVOTV_filter_default(_viewer)
  {
    var $inputField = $(this);

    $inputField.on("change keyup",
                   function (e)
                   {
                     var trimmedVal = $.trim($inputField.val());

                     _viewer.doFilter(trimmedVal || "",
                                      $inputField.data("columnId"));

                     var grid = _viewer.getGrid();
                     grid.invalidateAllRows();
                     grid.render();
                   });

    return this;
  }
})(jQuery);

