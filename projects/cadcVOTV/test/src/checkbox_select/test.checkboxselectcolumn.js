test("Test formatter.", 5, function ()
{
  var testSubject = new CADC.CheckboxSelectColumn({
    cssClass: "slick-cell-checkboxsel",
    width: 55,
    headerCssClass: "slick-header-column-checkboxsel"
  });

  var output1 = testSubject.getColumnDefinition()["formatter"]();

  equal(output1, null, "Should be null output.");

  var dataView = new Slick.Data.DataView({inlineFilters: true});

  dataView.getItems().push({"id": "01", "name": "COL1"});
  dataView.getItems().push({"id": "02", "name": "COL2"});

  var grid = new Slick.Grid("#testGrid", dataView,
                            [{"id": "id", "name": "name"}]);

  grid.setSelectionModel(new CADC.RowSelectionModel());

  testSubject.init(grid);

  // Select the first row.
  grid.setSelectedRows([0]);

  var output2 = testSubject.getColumnDefinition()["formatter"](1, null, null, null,
                                                               grid.getData().getItems()[1]);

  equal(output2, "<input class='_select_02' type='checkbox' />",
        "Should be unchecked checkbox output for first row.");

  var output3 = testSubject.getColumnDefinition()["formatter"](0, null, null, null,
                                                               grid.getData().getItems()[0]);

  equal(output3, "<input class='_select_01' type='checkbox' checked='checked' />",
        "Should be checked checkbox output for second row.");


  // Enable one-click downloads.
  console.log("Enabling one-click downloads...");

  testSubject = new CADC.CheckboxSelectColumn({
    cssClass: "slick-cell-checkboxsel",
    width: 55,
    headerCssClass: "slick-header-column-checkboxsel",
    enableOneClickDownload: true,
    oneClickDownloadURLPath: "/get"
  });

  testSubject.init(grid);

  // Select the second row.
  grid.setSelectedRows([1]);

  var output4 = testSubject.getColumnDefinition()["formatter"](1, null, null, null,
                                                               dataView.getItems()[1]);

  equal(output4, "<input class='_select_02' type='checkbox' checked='checked' />" +
                 "<span class=\"wb-icon-drive-download margin-left-small\"></span>",
        "Should be checked checkbox output and one-click download link for second row.");

  var output5 = testSubject.getColumnDefinition()["formatter"](0, null, null, null,
                                                               grid.getData().getItems()[0]);

  equal(output5, "<input class='_select_01' type='checkbox' />" +
                 "<span class=\"wb-icon-drive-download margin-left-small\"></span>",
        "Should be unchecked checkbox output and one-click download link for second row.");
});
