test("Test URI components from full URL.", 1, function()
{
  var myURI = new cadc.web.util.URI("http://www.mysite.com/path/1/2/item.txt");

  console.log("Expecting /path/1/2/item.txt but got " + myURI.getPath());
  equal(myURI.getPath(), "/path/1/2/item.txt",
        "Output should be /path/1/2/item.txt");
});

test("Test URI components from full URL 2.", 3, function()
{
  var myURI = new cadc.web.util.URI("http://www.mysite.com/path/item.txt?a=b&c=d");

  console.log("Expecting /path/item.txt but got " + myURI.getPath());
  equal(myURI.getPath(), "/path/item.txt",
        "Path should be /path/item.txt");

  var q = myURI.getQuery();

  equal("b", q.a[0], "Query string param a is wrong.");
  equal("d", q.c[0], "Query string param a is wrong.");
});

test("Test URI components from URI.", 1, function()
{
  var myURI = new cadc.web.util.URI("caom2:path/a/b/item.fits");

  console.log("Expecting path/a/b/item.fits but got " + myURI.getPath());
  equal(myURI.getPath(), "path/a/b/item.fits",
        "Output should be path/a/b/item.fits");
});

test("Test parse out full relative URI.", 1, function()
{
  var testSubject =
      new cadc.web.util.URI("http://www.mysite.com/path/item.txt?a=b&c=d");

  equal(testSubject.getRelativeURI(), "/path/item.txt?a=b&c=d",
        "Relative URI should be: /path/item.txt?a=b&c=d");
});

test("Test parse out path only relative URI.", 1, function()
{
  var testSubject =
      new cadc.web.util.URI("http://www.mysite.com/path/item.txt");

  equal(testSubject.getRelativeURI(), "/path/item.txt",
        "Relative URI should be: /path/item.txt");
});
