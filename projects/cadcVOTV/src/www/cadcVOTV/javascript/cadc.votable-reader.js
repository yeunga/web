(function ($)
{
  // register namespace
  $.extend(true, window, {
    "cadc": {
      "vot": {
        "Builder": Builder,
        "XMLBuilder": XMLBuilder,
        "JSONBuilder": JSONBuilder,
        "CSVBuilder": CSVBuilder,
        "StreamBuilder": StreamBuilder,

        // Events
        "onRowAdd": new jQuery.Event("onRowAdd"),
        "onLoadEnd": new jQuery.Event("onLoadEnd")
      }
    }
  });

  /**
   * Main builder class.  Uses an implementation of a certain kind of builder
   * internally.
   *
   * @param input
   * @param readyCallback
   * @param errorCallback
   * @constructor
   */
  function Builder(input, readyCallback, errorCallback)
  {
    var _selfBuilder = this;
    this.voTable = null;
    this._builder = null;

    function init()
    {
      if (input.xmlDOM && (input.xmlDOM.documentElement != null))
      {
        _selfBuilder._builder = new cadc.vot.XMLBuilder(input.xmlDOM);

        if (readyCallback)
        {
          readyCallback(_selfBuilder);
        }
      }
      else if (input.json)
      {
        _selfBuilder._builder = new cadc.vot.JSONBuilder(input.json);

        if (readyCallback)
        {
          readyCallback(_selfBuilder);
        }
      }
      else if (input.csv)
      {
        _selfBuilder._builder = new cadc.vot.CSVBuilder(input, buildRowData);

        if (readyCallback)
        {
          readyCallback(_selfBuilder);
        }
      }
      else if (input.url)
      {
        var streamBuilder = new cadc.vot.StreamBuilder(input, readyCallback,
                                                       errorCallback,
                                                       _selfBuilder);

        streamBuilder.start();
      }
      else
      {
        console.log("cadcVOTV: input object is not set or not recognizable");
        alert("cadcVOTV: input object is not set or not recognizable. \n\n"
                  + input);
      }
    }

    function getVOTable()
    {
      return _selfBuilder.voTable;
    }

    /**
     * For those builders that support streaming.
     * @param _responseData   More data.
     */
    function appendToBuilder(_responseData)
    {
      getInternalBuilder().append(_responseData)
    }

    function getInternalBuilder()
    {
      return _selfBuilder._builder;
    }

    function setInternalBuilder(_internalBuilder)
    {
      _selfBuilder._builder = _internalBuilder;
    }

    function getData()
    {
      if (getInternalBuilder())
      {
        return getInternalBuilder().getData();
      }
      else
      {
        return null;
      }
    }

    function build(buildRowData)
    {
      if (getInternalBuilder() && getInternalBuilder().build)
      {
        getInternalBuilder().build(buildRowData);
        _selfBuilder.voTable = getInternalBuilder().getVOTable();
      }
    }

    function subscribe(builderEvent, handler)
    {
      if (getInternalBuilder().subscribe)
      {
        getInternalBuilder().subscribe(builderEvent.type, handler);
      }
    }

    function setLongest(longestValues, cellID, newValue)
    {
      var stringLength = (newValue && newValue.length) ? newValue.length : -1;
      if (longestValues[cellID] === undefined)
      {
        longestValues[cellID] = -1;
      }
      if (stringLength > longestValues[cellID])
      {
        longestValues[cellID] = stringLength;
      }
    }

    function buildRowData(tableFields, rowID, rowData, longestValues, extract)
    {
      var rowCells = [];
      for (var cellIndex = 0; cellIndex < rowData.length; cellIndex++)
      {
        console.log("Looking at index " + cellIndex + " of field length " + tableFields.length);

        var cellField = tableFields[cellIndex];
        var cellDatatype = cellField.getDatatype();
        var stringValue = extract(cellIndex);

        setLongest(longestValues, cellField.getID(), stringValue);

        var cellValue;
        if (!$.isEmptyObject(cellDatatype) && cellDatatype.isNumeric())
        {
          var num;

          if (!stringValue || ($.trim(stringValue) == ""))
          {
            num = Number.NaN;
          }
          else if (cellDatatype.isFloatingPointNumeric())
          {
            num = parseFloat(stringValue);
            num.toFixed(2);
          }
          else
          {
            num = parseInt(stringValue);
          }
          cellValue = num;
        }
        else
        {
          cellValue = stringValue;
        }

        rowCells.push(new cadc.vot.Cell(cellValue, cellField));
      }

      return new cadc.vot.Row(rowID, rowCells);
    }


    $.extend(this,
             {
               "build": build,
               "buildRowData": buildRowData,
               "getVOTable": getVOTable,
               "getData": getData,
               "setInternalBuilder": setInternalBuilder,
               "appendToBuilder": appendToBuilder,

               // Event management
               "subscribe": subscribe
             });

    init();
  }

  /**
   * The XML plugin reader.
   *
   * @param _xmlDOM    The XML DOM to use.
   * @constructor
   */
  function XMLBuilder(_xmlDOM)
  {
    var _selfXMLBuilder = this;

    this.voTable = null;
    this.xmlDOM = _xmlDOM;

    function init()
    {
      if (getData().documentElement.nodeName == 'parsererror')
      {
        alert("VOView: XML input is invalid.\n\n");
      }
    }

    function getVOTable()
    {
      return _selfXMLBuilder.voTable;
    }

    /**
     * Evaluate an XPath expression aExpression against a given DOM node
     * or Document object (aNode), returning the results as an array
     * thanks wanderingstan at morethanwarm dot mail dot com for the
     * initial work.
     * @param _node     The Node to begin looking in.
     * @param _expression   The expression XPath to look for.
     */
    function evaluateXPath(_node, _expression)
    {
      var xpe = _node.ownerDocument || _node;
      var pathItems = _expression.split("/");
      var path = "./*";

      for (var i = 0; i < pathItems.length; i++)
      {
        var pathItem = pathItems[i];
        path += "[local-name()='" + pathItem + "']";

        if (i < (pathItems.length - 1))
        {
          path += "/*";
        }
      }

      var result = xpe.evaluate(path, _node, null,
                                XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
      var found = [];
      var res;

      while (res = result.iterateNext())
      {
        found.push(res);
      }

      return found;
    }

    function getData()
    {
      return _selfXMLBuilder.xmlDOM;
    }

    function build(buildRowData)
    {
      console.log("Entering XMLBuilder::build");

      var xmlVOTableDOM = evaluateXPath(this.getData(), "VOTABLE");
      var xmlVOTableResourceDOM = evaluateXPath(xmlVOTableDOM[0], "RESOURCE");

      var voTableParameters = [];
      var voTableResources = [];
      var voTableInfos = [];
      var resourceTables = [];
      var resourceInfos = [];

      var votableResourceInfoDOM = evaluateXPath(xmlVOTableResourceDOM[0],
                                                 "INFO");

      for (var infoIndex = 0; infoIndex < votableResourceInfoDOM.length;
           infoIndex++)
      {
        var nextInfo = votableResourceInfoDOM[infoIndex];
        resourceInfos.push(new cadc.vot.Info(nextInfo.getAttribute("name"),
                                             nextInfo.getAttribute("value")));
      }

      var votableResourceDescriptionDOM =
          evaluateXPath(xmlVOTableResourceDOM[0], "DESCRIPTION");

      var resourceDescription =
          votableResourceDescriptionDOM.length > 0
              ? votableResourceDescriptionDOM[0].value : "";
      var resourceMetadata = new cadc.vot.Metadata(null, resourceInfos,
                                                   resourceDescription, null,
                                                   null, null);
      var xmlVOTableResourceTableDOM = evaluateXPath(xmlVOTableResourceDOM[0],
                                                     "TABLE");

      // Iterate over tables.
      for (var tableIndex = 0; tableIndex < xmlVOTableResourceTableDOM.length;
           tableIndex++)
      {
        var resourceTableDOM = xmlVOTableResourceTableDOM[tableIndex];

        var tableFields = [];
        var resourceTableDescriptionDOM = evaluateXPath(resourceTableDOM,
                                                        "DESCRIPTION");
        var resourceTableDescription =
            resourceTableDescriptionDOM.length > 0
                ? resourceTableDescriptionDOM[0].value : "";

        var resourceTableFieldDOM = evaluateXPath(resourceTableDOM, "FIELD");

        // To record the longest value for each field (Column).  Will be stored in
        // the TableData instance.
        //
        // It contains a key of the field ID, and the value is the integer length.
        //
        // Born from User Story 1103.
        var longestValues = {};

        for (var fieldIndex = 0; fieldIndex < resourceTableFieldDOM.length;
             fieldIndex++)
        {
          var fieldDOM = resourceTableFieldDOM[fieldIndex];
          var fieldID;
          var xmlFieldID = fieldDOM.getAttribute("id");
          var xmlFieldUType = fieldDOM.getAttribute("utype");
          var xmlFieldName = fieldDOM.getAttribute("name");

          if (xmlFieldID && (xmlFieldID != ""))
          {
            fieldID = xmlFieldID;
          }
          else
          {
            fieldID = xmlFieldName;
          }

          longestValues[fieldID] = -1;

          var fieldDescriptionDOM = evaluateXPath(fieldDOM, "DESCRIPTION");

          var fieldDescription = ((fieldDescriptionDOM.length > 0)
                                      && fieldDescriptionDOM[0].childNodes
              && fieldDescriptionDOM[0].childNodes[0])
              ? fieldDescriptionDOM[0].childNodes[0].nodeValue
              : "";

          var field = new cadc.vot.Field(
              xmlFieldName,
              fieldID,
              fieldDOM.getAttribute("ucd"),
              xmlFieldUType,
              fieldDOM.getAttribute("unit"),
              fieldDOM.getAttribute("xtype"),
              new cadc.vot.Datatype(fieldDOM.getAttribute("datatype")),
              fieldDOM.getAttribute("arraysize"),
              fieldDescription,
              fieldDOM.getAttribute("name"));

          tableFields.push(field);
        }

        var tableMetadata = new cadc.vot.Metadata(null, null,
                                                  resourceTableDescription,
                                                  null, tableFields, null);

        var tableDataRows = [];
        var tableDataRowsDOM = evaluateXPath(resourceTableDOM,
                                             "DATA/TABLEDATA/TR");
        var tableFieldsMetadata = tableMetadata.getFields();

        for (var rowIndex = 0; rowIndex < tableDataRowsDOM.length; rowIndex++)
        {
          var rowDataDOM = tableDataRowsDOM[rowIndex];
          var rowCellsDOM = evaluateXPath(rowDataDOM, "TD");
          var rowID = rowDataDOM.getAttribute("id");

          if (!rowID)
          {
            rowID = "vov_" + rowIndex;
          }

          var rowData = buildRowData(tableFieldsMetadata, rowID, rowCellsDOM,
                                     longestValues, function (index)
              {
                var cellDataDOM = rowCellsDOM[index];
                return (cellDataDOM.childNodes && cellDataDOM.childNodes[0]) ?
                       cellDataDOM.childNodes[0].nodeValue : "";
              });
          tableDataRows.push(rowData);
        }

        var tableData = new cadc.vot.TableData(tableDataRows, longestValues);
        resourceTables.push(new cadc.vot.Table(tableMetadata, tableData));
      }

      voTableResources.push(
          new cadc.vot.Resource(xmlVOTableResourceDOM[0].getAttribute("type"),
                                resourceMetadata, resourceTables));

      var xmlVOTableDescription = evaluateXPath(xmlVOTableDOM[0],
                                                "DESCRIPTION");
      var voTableDescription = xmlVOTableDescription.length > 0
          ? xmlVOTableDescription[0].value : "";
      var voTableMetadata = new cadc.vot.Metadata(voTableParameters,
                                                  voTableInfos,
                                                  voTableDescription, null,
                                                  null, null);

      _selfXMLBuilder.voTable = new cadc.vot.VOTable(voTableMetadata,
                                                     voTableResources);
    }

    $.extend(this,
             {
               "build": build,
               "getData": getData,
               "getVOTable": getVOTable
             });

    init();
  }

  // End XML.

  /**
   * The JSON plugin reader.
   *
   * @param jsonData    The JSON VOTable.
   * @constructor
   */
  function JSONBuilder(jsonData)
  {
    var _selfJSONBuilder = this;

    this.voTable = null;
    this.jsonData = jsonData;

    function getVOTable()
    {
      return _selfJSONBuilder.voTable;
    }

    function getData()
    {
      return _selfJSONBuilder.jsonData;
    }

    function build()
    {
      // Does nothing yet.
    }
  }

  /**
   * The CSV plugin reader.
   *
   * @param input         The CSV type and table metadata.
   * @param buildRowData  The function to make something vo-consistent from the row data.
   * @constructor
   */
  function CSVBuilder(input, buildRowData)
  {

    var _selfCSVBuilder = this;

    var longestValues = [];
    var chunk = {lastMatch: 0, rowCount: 0};


    function append(asChunk)
    {
      var found = findRowEnd(asChunk, chunk.lastMatch);

      // skip the first row - it contains facsimiles of column names
      if (chunk.rowCount === 0 &&
          found > 0)
      {
        found = advanceToNextRow(asChunk, found);
      }

      while (found > 0 && found !== chunk.lastMatch)
      {
        nextRow(asChunk.slice(chunk.lastMatch, found));
        found = advanceToNextRow(asChunk, found);
      }
    }

    function getCurrent()
    {
      // this is for testing support only
      return chunk;
    }

    function subscribe(eName, eHandler)
    {
      $(document).on(eName, eHandler);
    }

    function advanceToNextRow(asChunk, lastFound)
    {
      chunk.rowCount++;
      chunk.lastMatch = lastFound;
      return findRowEnd(asChunk, chunk.lastMatch);
    }

    function findRowEnd(inChunk, lastFound)
    {
      return inChunk.indexOf("\n", lastFound + 1);
    }

    function nextRow(entry)
    {
      var entryAsArray = $.csv.toArray(entry);
      var tableFields = input.tableMetadata.getFields();

      var rowData = buildRowData(tableFields, "vov_" + chunk.rowCount,
                                 entryAsArray,
                                 longestValues,
                                 function (index)
                                 {
                                   return entryAsArray[index].trim();
                                 });

      $.event.trigger(cadc.vot.onRowAdd, rowData);
    }

    $.extend(this,
             {
               "append": append,
               "getCurrent": getCurrent,
               "subscribe": subscribe
             });

  }

  /**
   *
   * @param input
   * @param readyCallback
   * @param errorCallback
   * @param __MAIN_BUILDER
   * @constructor
   */
  function StreamBuilder(input, readyCallback, errorCallback, __MAIN_BUILDER)
  {
    var _selfStreamBuilder = this;

    this.errorCallbackFunction = null;
    this.url = input.url;

    function init()
    {
      if (errorCallback)
      {
        _selfStreamBuilder.errorCallbackFunction = errorCallback;
      }
      else
      {
        _selfStreamBuilder.errorCallbackFunction =
        function (jqXHR, status, message)
        {
          var outputMessage =
              "cadcVOTV: Unable to read from URL (" + input.url + ").";

          if (message && ($.trim(message) != ""))
          {
            outputMessage += "\n\nMessage from server: " + message;
          }

          alert(outputMessage);
        };
      }
    }

    function getErrorCallbackFunction()
    {
      return _selfStreamBuilder.errorCallbackFunction;
    }

    function getURL()
    {
      return _selfStreamBuilder.url;
    }

    function start()
    {
      $.ajax({
               url: getURL(),
               type: "GET",
               xhr: createRequest
             }).fail(getErrorCallbackFunction());
    }

    /**
     * Create the internal builder once the request has been established.
     */
    function initializeInternalBuilder()
    {
      if (this.readyState == this.HEADERS_RECEIVED)
      {
        var contentType = this.getResponseHeader("Content-Type");

        // Only CSV supports streaming!
        if (contentType.indexOf("csv") >= 0)
        {
          __MAIN_BUILDER.setInternalBuilder(
                new cadc.vot.CSVBuilder(input, __MAIN_BUILDER.buildRowData));

          if (readyCallback)
          {
            readyCallback(__MAIN_BUILDER);
          }
        }
        else
        {
          console.log("cadcVOTV: Unable to obtain XML, JSON, or CSV VOTable from URL");
          alert("cadcVOTV: Unable to obtain XML, JSON, or CSV VOTable from URL ("
                + input.url + ").");
        }
      }
    }

    function handleProgress()
    {
      __MAIN_BUILDER.appendToBuilder(this.responseText);
    }

    function loadEnd()
    {
      $.event.trigger(cadc.vot.onLoadEnd);
    }

    function createRequest()
    {
      var request = new XMLHttpRequest();

      request.addEventListener("readystatechange", initializeInternalBuilder,
                               false);
      request.addEventListener("progress", handleProgress, false);
      request.addEventListener("loadend", loadEnd, false);

      return request;
    }

    $.extend(this,
             {
               "start": start
             });

    init();
  }

})(jQuery);
