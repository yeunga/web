/**
 * ***********************************************************************
 * ******************  CANADIAN ASTRONOMY DATA CENTRE  *******************
 * *************  CENTRE CANADIEN DE DONNÉES ASTRONOMIQUES  **************
 * <p/>
 * (c) 2010.                            (c) 2010.
 * Government of Canada                 Gouvernement du Canada
 * National Research Council            Conseil national de recherches
 * Ottawa, Canada, K1A 0R6              Ottawa, Canada, K1A 0R6
 * All rights reserved                  Tous droits réservés
 * <p/>
 * NRC disclaims any warranties,        Le CNRC dénie toute garantie
 * expressed, implied, or               énoncée, implicite ou légale,
 * statutory, of any kind with          de quelque nature que ce
 * respect to the software,             soit, concernant le logiciel,
 * including without limitation         y compris sans restriction
 * any warranty of merchantability      toute garantie de valeur
 * or fitness for a particular          marchande ou de pertinence
 * purpose. NRC shall not be            pour un usage particulier.
 * liable in any event for any          Le CNRC ne pourra en aucun cas
 * damages, whether direct or           être tenu responsable de tout
 * indirect, special or general,        dommage, direct ou indirect,
 * consequential or incidental,         particulier ou général,
 * arising from the use of the          accessoire ou fortuit, résultant
 * software.  Neither the name          de l'utilisation du logiciel. Ni
 * of the National Research             le nom du Conseil National de
 * Council of Canada nor the            Recherches du Canada ni les noms
 * names of its contributors may        de ses  participants ne peuvent
 * be used to endorse or promote        être utilisés pour approuver ou
 * products derived from this           promouvoir les produits dérivés
 * software without specific prior      de ce logiciel sans autorisation
 * written permission.                  préalable et particulière
 * par écrit.
 * <p/>
 * This file is part of the             Ce fichier fait partie du projet
 * OpenCADC project.                    OpenCADC.
 * <p/>
 * OpenCADC is free software:           OpenCADC est un logiciel libre ;
 * you can redistribute it and/or       vous pouvez le redistribuer ou le
 * modify it under the terms of         modifier suivant les termes de
 * the GNU Affero General Public        la “GNU Affero General Public
 * License as published by the          License” telle que publiée
 * Free Software Foundation,            par la Free Software Foundation
 * either version 3 of the              : soit la version 3 de cette
 * License, or (at your option)         licence, soit (à votre gré)
 * any later version.                   toute version ultérieure.
 * <p/>
 * OpenCADC is distributed in the       OpenCADC est distribué
 * hope that it will be useful,         dans l’espoir qu’il vous
 * but WITHOUT ANY WARRANTY;            sera utile, mais SANS AUCUNE
 * without even the implied             GARANTIE : sans même la garantie
 * warranty of MERCHANTABILITY          implicite de COMMERCIALISABILITÉ
 * or FITNESS FOR A PARTICULAR          ni d’ADÉQUATION À UN OBJECTIF
 * PURPOSE.  See the GNU Affero         PARTICULIER. Consultez la Licence
 * General Public License for           Générale Publique GNU Affero
 * more details.                        pour plus de détails.
 * <p/>
 * You should have received             Vous devriez avoir reçu une
 * a copy of the GNU Affero             copie de la Licence Générale
 * General Public License along         Publique GNU Affero avec
 * with OpenCADC.  If not, see          OpenCADC ; si ce n’est
 * <http://www.gnu.org/licenses/>.      pas le cas, consultez :
 * <http://www.gnu.org/licenses/>.
 * <p/>
 * ***********************************************************************
 */
package ca.nrc.cadc.web.selenium;


import java.io.File;
import java.io.IOException;
import java.lang.reflect.Constructor;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import junit.framework.AssertionFailedError;
import org.apache.commons.io.FileUtils;

import org.junit.Rule;
import org.junit.rules.ExternalResource;
import org.junit.runner.Description;
import org.junit.runners.model.Statement;
import org.openqa.selenium.*;
import org.openqa.selenium.interactions.Actions;
import org.openqa.selenium.remote.Augmenter;
import org.openqa.selenium.remote.DesiredCapabilities;
import org.openqa.selenium.remote.RemoteWebDriver;
import org.openqa.selenium.support.ui.ExpectedCondition;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.Select;
import org.openqa.selenium.support.ui.WebDriverWait;

import ca.nrc.cadc.util.StringUtil;


/**
 * Subclasses of this should have the necessary tools to create an automated
 * web application test.
 */
public abstract class AbstractWebApplicationIntegrationTest
{
    // One minute is just too long.
    private static final int TIMEOUT_IN_SECONDS = 60;
    private static final int TIMEOUT_IN_MILLISECONDS = (TIMEOUT_IN_SECONDS
                                                        * 1000);
    private static final String SELENIUM_SERVER_URL_ENDPOINT = "/wd/hub";
    private static final Map<String, DesiredCapabilities> CAPABILITIES_LOOKUP =
            new HashMap<>();

    static
    {
        CAPABILITIES_LOOKUP.put("firefox", DesiredCapabilities.firefox());
        CAPABILITIES_LOOKUP.put("safari", DesiredCapabilities.safari());
        CAPABILITIES_LOOKUP.put("chrome", DesiredCapabilities.chrome());
        CAPABILITIES_LOOKUP.put("opera", DesiredCapabilities.operaBlink());
    }

    private String seleniumServerURL;
    private String webURL;
    private String username;
    private String password;
    private int currentWaitTime;
    private boolean failOnTimeout;

    protected DesiredCapabilities driverCapabilities;
    protected WebDriver driver;

    
    @Rule
    public ExternalResource testWatcher = new ExternalResource()
    {
        @Override
        public Statement apply(final Statement base,
                               final Description description)
        {
            return new Statement()
            {
                @Override
                public void evaluate() throws Throwable
                {
                    before();
                    try
                    {
                        base.evaluate();
                    }
                    catch (Throwable t)
                    {
                        captureScreenShot(description.getClassName() + "."
                                          + description.getMethodName());
                        throw t;
                    }
                    finally
                    {
                        after();
                    }
                }
            };
        }

        /**
         * Override to set up your specific external resource.
         *
         * @throws Throwable if setup fails (which will disable {@code after}
         */
        @Override
        protected void before() throws Throwable
        {
            driverCapabilities.setJavascriptEnabled(true);

            try
            {
                final String seleniumURL;
                if (seleniumServerURL.contains(SELENIUM_SERVER_URL_ENDPOINT))
                {
                    seleniumURL = seleniumServerURL;
                }
                else
                {
                    seleniumURL = seleniumServerURL
                                  + SELENIUM_SERVER_URL_ENDPOINT;
                }

                System.out.println("Connecting to " + seleniumURL);

                driver = new RemoteWebDriver(new URL(seleniumURL),
                                             driverCapabilities);
            }
            catch (MalformedURLException e)
            {
                System.err.println("Can't create URL.");
                e.printStackTrace(System.err);
                throw new RuntimeException(e);
            }

            driver.manage().window().maximize();

            final WebDriver.Timeouts timeouts = driver
                    .manage().timeouts();

            // Safari does not support setTimeout.
            if (!driverCapabilities.getBrowserName().contains("afari"))
            {
                // Set the timeout to four minutes.
                timeouts.pageLoadTimeout(TIMEOUT_IN_MILLISECONDS,
                                         TimeUnit.MILLISECONDS);
            }

            timeouts.setScriptTimeout(TIMEOUT_IN_MILLISECONDS,
                                      TimeUnit.MILLISECONDS);
        }

        /**
         * Override to tear down your specific external resource.
         */
        @Override
        protected void after()
        {
            if (driver != null)
            {
                try
                {
                    driver.quit();
                }
                catch (Exception de)
                {
                    System.err.println("Driver could not quit!");
                    de.printStackTrace(System.err);
                }
                finally
                {
                    driver = null;
                }
            }

            System.out.println("Finished.");
        }

        void captureScreenShot(final String methodName) throws IOException
        {
            final String filename = methodName + ".png";
            final WebDriver augmentedDriver = new Augmenter().augment(driver);
            final File sourceFile =
                    ((TakesScreenshot) augmentedDriver).getScreenshotAs(
                            OutputType.FILE);

            FileUtils.copyFile(sourceFile, new File("./" + filename));

            System.err.println(String.format("Saved screenshot as '%s'", filename));
        }
    };


    public AbstractWebApplicationIntegrationTest()
    {
        // Base Host of the web application to be tested.
        final String seleniumURL = System.getProperty("selenium.server.url");
        if (seleniumURL == null)
        {
            throw new RuntimeException(
                    "selenium.server.url System property not set");
        }
        else
        {
            seleniumServerURL = seleniumURL;
        }

        // Schema of the web application to be tested.
        final String driver = System.getProperty("driver");
        if (!StringUtil.hasText(driver))
        {
            throw new RuntimeException("driver System property not set.");
        }
        else
        {
            driverCapabilities = CAPABILITIES_LOOKUP.get(driver.toLowerCase());

            if (driverCapabilities == null)
            {
                throw new IllegalArgumentException(
                        String.format("No such browser > '%s'\nValid values are "
                                      + Arrays.toString(CAPABILITIES_LOOKUP.keySet().toArray(new String[4])),
                                      driver));
            }
        }

        final String userName = System.getProperty("user.name");
        if (!StringUtil.hasText(userName))
        {
            System.out.println("No username set!  Set the user.name system "
                               + "property if BASIC authentication is required.");
        }
        else
        {
            setUsername(userName);
        }

        if (StringUtil.hasText(getUsername()))
        {
            final String userPassword = System.getProperty("user.password");
            if (!StringUtil.hasText(userPassword))
            {
                System.out.println("No password set!  Set the user.password system "
                            + "property if BASIC authentication is required.");
            }
            else
            {
                setPassword(userPassword);
            }
        }

        // Base Host of the web application to be tested.
        final String applicationURL = System.getProperty("web.app.url");
        if (!StringUtil.hasText(applicationURL))
        {
            throw new RuntimeException("web.app.url System property "
                                       + "is missing.");
        }
        else
        {
            webURL = applicationURL;
        }

        System.out.println("Web URL: " + webURL);
        System.out.println("Selenium Server: " + seleniumServerURL);
        System.out.println("Done with Abstract Web Test constructor.");
    }

    /**
     * Navigate to the given location.
     *
     * @param path  The navigation path.
     * @param query The query.
     * @throws Exception    For any test problems.
     * @see <a href="https://code.google.com/p/selenium/wiki/PageObjects">Page Objects</a>
     * @deprecated Please use {@link #goTo(String, String, Class)} instead and
     * adapt to the PageObject model.
     */
    public void goTo(final String path, final String query) throws Exception
    {
        driver.get(webURL + path + (StringUtil.hasText(query)
                                         ? ("?" + query) : ""));
    }


    /**
     * Visit the given path with a query attached to it.  Return the page with
     * the given class.
     *
     * @param path      The navigation path.
     * @param query     The query.
     * @param pageClass The class of the returned instance.
     * @param <T>       The type of Page to return.
     *
     * @return  A page element.
     * @throws Exception  For any test execution errors
     */
    public <T extends AbstractTestWebPage> T goTo(final String path,
                                                  final String query,
                                                  final Class<T> pageClass)
            throws Exception
    {
        final String webAppURL = webURL + path + (StringUtil.hasText(query)
                                                  ? ("?" + query) : "");
        System.out.println("Visiting: " + webAppURL);
        driver.get(webAppURL);

        final Class[] constructorArgTypes = new Class[]{WebDriver.class};
        final Constructor<T> constructor =
                pageClass.getConstructor(constructorArgTypes);
        return constructor.newInstance(driver);
    }

    protected void goBack() throws Exception
    {
        driver.navigate().back();
    }

    /**
     * Like assertTrue, but fails at the end of the test (during tearDown)
     *
     * @param b The boolean flag to check for truthiness.
     */
    protected void verifyTrue(final boolean b)
    {
        if (!b)
        {
            throw new IllegalArgumentException("Verification failed.");
        }
    }

    protected void verifyEquals(final Object o1, final Object o2)
    {
        verifyTrue(o1.equals(o2));
    }

    protected void check(final By by) throws Exception
    {
        click(by);
    }

    protected void uncheck(final By by) throws Exception
    {
        if (find(by).isSelected())
        {
            click(by);
        }
    }

    protected WebElement find(final By by)
    {
        try
        {
            return driver.findElement(by);
        }
        catch (Throwable e)
        {
            System.err.println("No element found: " + by.toString());
            return null;
        }
    }

    protected void click(final By by) throws Exception
    {
        waitForElementPresent(by);
        click(find(by));
    }

    protected void click(final WebElement elem) throws Exception
    {
        elem.click();
    }

    protected void resetForm() throws Exception
    {
        resetForm(By.cssSelector("input[type=\"reset\"]"));
    }

    protected void resetForm(final By resetButtonBy) throws Exception
    {
        click(resetButtonBy);
    }

    protected void verifyElementChecked(final By by) throws Exception
    {
        verifyTrue(find(by).isSelected());
    }

    protected void verifyElementUnChecked(final By by) throws Exception
    {
        verifyFalse(find(by).isSelected());
    }

    protected boolean elementExists(final By by) throws Exception
    {
        return (find(by) != null);
    }

    protected void verifyElementPresent(final By by)
    {
        final WebElement webElement = find(by);
        verifyFalse(webElement == null);
    }

    protected void verifyDisabledInput(final String idSelector) throws Exception
    {
        final Object obj =
                executeJavaScript("return document.getElementById('"
                                  + idSelector + "').disabled;");

        verifyTrue((obj != null) && ((Boolean) obj));
    }

    protected void verifyElementNotPresent(final By by) throws Exception
    {
        verifyTrue((find(by) == null));
    }

    /**
     * Issue a drag and drop command.
     *
     * @param source      The source element.
     * @param destination The to (target) element to drop into.
     */
    protected void dragAndDrop(final By source, final By destination)
    {
        (new Actions(driver)).dragAndDrop(find(source), find(destination))
                .perform();
    }

    /**
     * Scroll a container (e.g. div) until the element with elementID is
     * visible.
     *
     * @param elementID           The ID of the element to find.
     * @param containerToScrollID The container to scroll.
     * @throws Exception  For any test execution errors
     */
    protected void scrollVerticallyIntoView(final String elementID,
                                            final String containerToScrollID)
            throws Exception
    {
        final String script =
                "var myElement = document.getElementById('" + elementID
                + "');"
                + "var topPos = myElement.offsetTop;"
                + "document.getElementById('" + containerToScrollID
                + "').scrollTop = topPos;";

        ((JavascriptExecutor) driver).executeScript(script);
    }


    /**
     * Scroll the Grid.  This is for cadcVOTV grids.
     *
     * @param elementIDToScroll The ID of the container.
     * @throws Exception  For any test execution errors
     */
    protected void scrollGrid(final String elementIDToScroll) throws Exception
    {
        final String findByClassNameLoop =
                "for (i in elems) {"
                + "if((' ' + elems[i].className + ' ').indexOf(' slick-viewport ') > -1) {"
                + "targetDiv = elems[i];break;"
                + "}}";
        final String script =
                "var objDiv = document.getElementById('" + elementIDToScroll
                + "'), targetDiv; var elems = objDiv.getElementsByTagName('div'), i;"
                + findByClassNameLoop
                + " targetDiv.scrollTop += 25;";

        executeJavaScript(script);
    }

    /**
     * Scroll the Grid.  This is for cadcVOTV grids.
     *
     * @param elementIDToScroll The ID of the container.
     * @throws Exception  For any test execution errors
     */
    protected void scrollGridHorizontally(final String elementIDToScroll)
            throws Exception
    {
        final String findByClassNameLoop =
                "for (i in elems) {"
                + "if((' ' + elems[i].className + ' ').indexOf(' slick-pane-right ') > -1) {"
                + "targetDiv = elems[i];break;"
                + "}}";
        final String script =
                "var objDiv = document.getElementById('" + elementIDToScroll
                + "'), targetDiv; var elems = objDiv.getElementsByTagName('div'), i;"
                + findByClassNameLoop
                + " targetDiv.scrollRight += 125;";

        executeJavaScript(script);
    }

    protected void verifyTextPresent(final By by, final String value)
            throws Exception
    {
        verifyTrue(getText(by).contains(value));
    }

    protected void verifyTextMatches(final By by, final String regex)
            throws Exception
    {
        verifyTrue(getText(by).matches(regex));
    }

    protected void verifyText(final By by, final String value) throws Exception
    {
        verifyEquals(value, getText(by));
    }

    protected String getText(final By by)
    {
        return find(by).getText();
    }

    protected boolean isTextPresent(final String text) throws Exception
    {
        return driver.getPageSource().contains(text);
    }

    protected void verifyTextPresent(final String text) throws Exception
    {
        verifyTrue(isTextPresent(text));
    }

    protected void verifyTextNotPresent(final String text) throws Exception
    {
        verifyFalse(isTextPresent(text));
    }

    protected void verifyFalse(final boolean b)
    {
        if (b)
        {
            throw new IllegalArgumentException("Verification failed.");
        }
    }

    protected String getName()
    {
        return this.getClass().getName();
    }

    protected void waitForTextPresent(final String text) throws Exception
    {
        while (!driver.getPageSource().contains(text))
        {
            waitOneSecond();
        }

        waitOneSecond();
        setCurrentWaitTime(0);
    }

    /**
     * Wait for text to be present in the given locator.
     *
     * @param by        Finder element.
     * @param text      Text to wait for.
     * @throws Exception  For any test execution errors
     * @deprecated Use {@link AbstractTestWebPage#waitForTextPresent(By, String)}
     */
    protected void waitForTextPresent(final By by, final String text) throws
                                                                      Exception
    {
        waitForElementPresent(by);
        while (!find(by).getText().contains(text))
        {
            waitFor(500L);
        }
    }

    protected void inputTextValue(final By by, final String value)
            throws Exception
    {
        inputTextValue(by, value, true);
    }

    protected void clearTextInput(final By by) throws Exception
    {
        final WebElement inputElement =
                waitUntil(ExpectedConditions.presenceOfElementLocated(by));

        // Focus issues.
        hover(by);
        inputElement.click();
        inputElement.clear();
    }

    protected void inputTextValue(final By by, final String value,
                                  final boolean clean) throws Exception
    {
        inputTextValue(by, value, clean, true);
    }

    protected void inputTextValue(final By by, final String value,
                                  final boolean clean,
                                  final boolean moveToInput) throws Exception
    {
        waitForElementPresent(by);
        final WebElement inputElement = find(by);

        if (moveToInput)
        {
            hover(by);
            inputElement.click();
        }

        if (clean)
        {
            clearTextInput(by);
        }

        if (StringUtil.hasText(value))
        {
            for (final char c : value.toCharArray())
            {
                inputElement.sendKeys(Character.toString(c));
                waitFor(250L);
            }
        }
    }

    protected void hover(final By by) throws Exception
    {
        // Wicked hack.  I hate this.
        // jenkinsd 2014.04.10
        //
        if (driverCapabilities.getBrowserName().contains("afari"))
        {
            final String byString = by.toString();
            final String value =
                    byString.substring(byString.indexOf(":") + 1).trim();
            final String locatorPrefix;
            final String locatorSuffix;

            if (by instanceof By.ById)
            {
                locatorPrefix = "\"#";
                locatorSuffix = "\"";
            }
            else if (by instanceof By.ByClassName)
            {
                locatorPrefix = "\".";
                locatorSuffix = "\"";
            }
            else if (by instanceof By.ByLinkText)
            {
                locatorPrefix = "\"a:contains('";
                locatorSuffix = "')\"";
            }
            else if (by instanceof By.ByName)
            {
                locatorPrefix = "\"[name='";
                locatorSuffix = "']\"";
            }
            else
            {
                locatorPrefix = "\"";
                locatorSuffix = "\"";
            }

            executeJavaScript("$(" + locatorPrefix + value + locatorSuffix
                              + ").hover();");
        }
        else
        {
            hover(find(by));
        }
    }

    protected Object executeJavaScript(final String javaScript) throws Exception
    {
        return ((JavascriptExecutor) driver).executeScript(javaScript);
    }

    protected void hover(final WebElement element) throws Exception
    {
        final Actions action = new Actions(driver);
        action.moveToElement(element).click().build().perform();
    }

    protected void waitForElementVisible(final By by) throws Exception
    {
        assert (waitUntil(
                ExpectedConditions.visibilityOfElementLocated(by)) != null);
    }

    protected void waitForElementInvisible(final By by) throws Exception
    {
        assert (waitUntil(
                ExpectedConditions.invisibilityOfElementLocated(by)) != null);
    }

    protected void waitForElementPresent(final By by) throws Exception
    {
        if (waitUntil(ExpectedConditions.presenceOfElementLocated(by)) == null)
        {
            fail("Could not find " + by.toString());
        }
    }

    protected void waitForElementNotPresent(final By by) throws Exception
    {
        waitUntil(ExpectedConditions.invisibilityOfElementLocated(by));
    }

    protected <V> V waitUntil(
            final ExpectedCondition<V> expectedCondition)
            throws Exception
    {
        final WebDriverWait webDriverWait =
                new WebDriverWait(driver, TIMEOUT_IN_SECONDS);
        return webDriverWait.until(expectedCondition);
    }

    protected String getCurrentWindowHandle() throws Exception
    {
        return driver.getWindowHandle();
    }

    protected WebDriver selectWindow(final String windowHandle) throws Exception
    {
        return driver.switchTo().window(windowHandle);
    }

    protected void closeWindow(final String windowHandle) throws Exception
    {
        selectWindow(windowHandle).close();
    }

    protected void waitFor(final int seconds) throws Exception
    {
        int count = 0;
        while (count <= seconds)
        {
            waitOneSecond();
            count++;
        }

        setCurrentWaitTime(0);
    }

    protected void setSeleniumServerURL(final String seleniumServerURL)
    {
        this.seleniumServerURL = seleniumServerURL;
    }

    protected String getUsername()
    {
        return username;
    }

    protected void setUsername(String username)
    {
        this.username = username;
    }

    protected String getPassword()
    {
        return password;
    }

    protected void setPassword(String password)
    {
        this.password = password;
    }

    protected String getWebURL()
    {
        return webURL;
    }

    protected void setWebURL(String webURL)
    {
        this.webURL = webURL;
    }

    protected int getCurrentWaitTime()
    {
        return currentWaitTime;
    }

    protected void setCurrentWaitTime(final int currentWaitTime)
    {
        this.currentWaitTime = currentWaitTime;
    }

    /**
     * Fails a test with the given message.
     *
     * @param message Message to display explaining the failure.
     */
    protected void fail(final String message)
    {
        throw new AssertionFailedError(message);
    }

    protected boolean isFailOnTimeout()
    {
        return failOnTimeout;
    }

    protected void setFailOnTimeout(boolean failOnTimeout)
    {
        this.failOnTimeout = failOnTimeout;
    }

    /**
     * Wait one second.
     *
     * @throws Exception If anything went wrong.
     */
    protected void waitOneSecond() throws Exception
    {
        if (isFailOnTimeout()
            && (getCurrentWaitTime() >= TIMEOUT_IN_MILLISECONDS))
        {
            fail("Timed out.");
        }
        else
        {
            setCurrentWaitTime(getCurrentWaitTime() + 1000);
            waitFor(1000L);
        }
    }

    /**
     * Allow waiting for less than a second.
     *
     * @param milliseconds Time in milliseconds to wait.
     * @throws Exception  For any test execution errors
     */
    protected void waitFor(final long milliseconds) throws Exception
    {
        Thread.sleep(milliseconds);
    }
}
