(function ($) {
  // register namespace
  $.extend(true, window, {
    "cadc": {
      "vot": {
        "Builder": Builder,
        "XMLBuilder": XMLBuilder,
        "JSONBuilder": JSONBuilder
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
      else if (input.url)
      {
        var errorCallbackFunction;

        if (errorCallback)
        {
          errorCallbackFunction = errorCallback;
        }
        else
        {
          errorCallbackFunction = function(jqXHR, status, message)
          {
            var outputMessage =
                "VOView: Unable to read from URL (" + input.url + ").";

            if (message && ($.trim(message) != ""))
            {
              outputMessage += "\n\nMessage from server: " + message;
            }

            alert(outputMessage);
          };
        }

        $.get(input.url, {}, function(data, textStatus, jqXHR)
        {
          var contentType = jqXHR.getResponseHeader("Content-Type");

          if (contentType.indexOf("xml") > 0)
          {
            _selfBuilder._builder = new cadc.vot.XMLBuilder(data);

            if (readyCallback)
            {
              readyCallback(_selfBuilder);
            }
          }
          else if (contentType.indexOf("json") > 0)
          {
            _selfBuilder._builder = new cadc.vot.JSONBuilder(data);

            if (readyCallback)
            {
              readyCallback(_selfBuilder);
            }
          }
          else
          {
            alert("cadcVOTV: Unable to obtain XML or JSON VOTable from URL ("
                      + input.url + ").");
          }
        }).error(errorCallbackFunction);
      }
      else
      {
        alert("cadcVOTV: input object is not set or not recognizeable. \n\n"
                  + input);
      }
    }

    function getVOTable()
    {
      return _selfBuilder.voTable;
    }

    function getInternalBuilder()
    {
      return _selfBuilder._builder;
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

    function build()
    {
      if (getInternalBuilder())
      {
        getInternalBuilder().build();
        _selfBuilder.voTable = getInternalBuilder().getVOTable();
      }
    }

    $.extend(this,
             {
               "build": build,
               "getVOTable": getVOTable,
               "getData": getData
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

    function build()
    {
      var startD = new Date();

      var xmlVOTableDOM = evaluateXPath(this.getData(), "VOTABLE");
      var xmlVOTableResourceDOM = evaluateXPath(xmlVOTableDOM[0], "RESOURCE");

      var voTableParameters = [];
      var voTableResources = [];
      var voTableInfos = [];
      var resourceTables = [];
      var resourceInfos = [];

      var votableResourceInfoDOM = evaluateXPath(xmlVOTableResourceDOM[0],
                                                 "INFO");

      for (var infoIndex in votableResourceInfoDOM)
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
      for (var tableIndex in xmlVOTableResourceTableDOM)
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

        for (var fieldIndex in resourceTableFieldDOM)
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
              fieldDOM.getAttribute("datatype"),
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
        for (var rowIndex in tableDataRowsDOM)
        {
          var rowDataDOM = tableDataRowsDOM[rowIndex];
          var rowCells = [];

          var rowCellsDOM = evaluateXPath(rowDataDOM, "TD");

          for (var cellIndex in rowCellsDOM)
          {
            var cellDataDOM = rowCellsDOM[cellIndex];
            var cellField = tableFields[cellIndex];
            var dataType = cellField.getDatatype()
                ? cellField.getDatatype().toLowerCase() : "";
            var stringValue = (cellDataDOM.childNodes && cellDataDOM.childNodes[0])
                ? cellDataDOM.childNodes[0].nodeValue : "";
            var stringValueLength = (stringValue && stringValue.length)
                ? stringValue.length : -1;
            var currLongestValue = longestValues[cellField.getID()];

            if (stringValueLength > currLongestValue)
            {
              longestValues[cellField.getID()] = stringValueLength;
            }

            var cellValue;

            if ((dataType == "double") || (dataType == "int")
                    || (dataType == "long") || (dataType == "float")
                || (dataType == "short"))
            {
              var num;

              if (!stringValue || ($.trim(stringValue) == ""))
              {
                num = "";
              }
              else if ((dataType == "double") || (dataType == "float"))
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

          var rowID = rowDataDOM.getAttribute("id");

          if (!rowID)
          {
            rowID = "vov_" + rowIndex;
          }

          tableDataRows.push(new cadc.vot.Row(rowID, rowCells));
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

      var endD = new Date();
      console.log("TOTAL BUILD: " + ((endD.getTime() - startD.getTime()) / 1000)
                  + " seconds");
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

})(jQuery);