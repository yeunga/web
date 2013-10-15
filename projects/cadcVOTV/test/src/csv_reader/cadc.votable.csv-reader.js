test("Read in simple CSV VOTable.", 6, function ()
{
  var csvData =
      "Job ID, User, Started, Status, Command, VM Type, CPUs, Memory, Job Starts\n"
          + "735.0, jenkinsd, , Idle, sleep, Tomcat, 1, 3072, 0\n"
          + "734.0,jenkinsd,,Idle,sleep,Tomcat,1,3072,0\n";

  var csvAsArray = $.csv.toArrays(csvData);

  var tableFields = [new cadc.vot.Field(csvAsArray[0][0]),
                     new cadc.vot.Field(csvAsArray[0][1]),
                     new cadc.vot.Field(csvAsArray[0][2]),
                     new cadc.vot.Field(csvAsArray[0][3]),
                     new cadc.vot.Field(csvAsArray[0][4]),
                     new cadc.vot.Field(csvAsArray[0][5]),
                     new cadc.vot.Field(csvAsArray[0][6]),
                     new cadc.vot.Field(csvAsArray[0][7]),
                     new cadc.vot.Field(csvAsArray[0][8])];

  var tableMetadata = new cadc.vot.Metadata(
      null, null, null, null, tableFields, null);

  try
  {
    var voTableBuilder = new cadc.vot.CSVBuilder(csvData, tableMetadata);
    var genericBuilder = new cadc.vot.Builder(csvData);

    voTableBuilder.build(genericBuilder.buildRowData);
    equal(voTableBuilder.getVOTable().getResources().length, 1,
          "Should be one resource.");

    var firstTableObject = voTableBuilder.getVOTable().getResources()[0].getTables()[0];
    equal(firstTableObject.getFields().length, 9, "Should have nine fields.");
    equal(firstTableObject.getTableData().getRows().length, 2,
          "Should have two rows.");

    var firstRow = firstTableObject.getTableData().getRows()[0];
    equal(firstRow.getCells()[1].getValue(), "jenkinsd",
          "Should be 'jenkinsd' in second cell of first row.");
    ok(!isNaN(firstRow.getCells()[6].getValue()) && (firstRow.getCells()[6].getValue() == Number(1)),
       "Should be numeric value in seventh cell of first row.");
    ok(!isNaN(firstRow.getCells()[7].getValue()) && (firstRow.getCells()[7].getValue() == Number(3072)),
       "Should be numeric value in eighth cell of first row.");
  }
  catch (error)
  {
    console.log(error.stack);
  }

});
