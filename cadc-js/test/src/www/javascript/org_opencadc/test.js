test("Test String util.", 6, function ()
{
  var stringUtil = new org.opencadc.StringUtil();

  var output = stringUtil.sanitize("MY&&<>VAL");

  equal(output, "MY&amp;&amp;&lt;&gt;VAL",
        "Output should be MY&amp;&amp;&lt;&gt;VAL");

  equal(stringUtil.hasText("MY&&<>VAL"), true, "Should return true.");

  equal(stringUtil.hasText(""), false, "Should return false.");

  equal(stringUtil.hasText(-14.567), true, "Should return true.");

  equal(stringUtil.hasText(0), true, "Should return true.");

  equal(stringUtil.format("Val {1} is {2} but not {3}", ["ONE", "TWO"]),
        "Val ONE is TWO but not {3}", "String does not match.");
});

test("String util matches", 3, function()
{
  var testSubject = new org.opencadc.StringUtil();
  var testString = "ALL YOUr base Are BEELong to me!";

  equal(testSubject.matches(/long/gi, testString), true, "Should match");
  equal(testSubject.matches(/belong/gi, testString), false, "Should not match");
  equal(testSubject.matches(/me!/gi, testString), true, "Should match");
});

test("String util contains", 5, function()
{
  var testSubject = new org.opencadc.StringUtil();
  var testString = "ALL YOUr base Are BEELong to me!";

  equal(testSubject.contains(testString, "BEEL", false), true, "Should contain");
  equal(testSubject.contains(testString, "belong"), false, "Should not contain");
  equal(testSubject.contains(testString, "!"), true, "Should contain");
  equal(testSubject.contains(testString, "BAse"), true, "Should contain");
  equal(testSubject.contains(testString, "are", true), false, "Should not contain");
});
