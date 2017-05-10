/*
 ************************************************************************
 *******************  CANADIAN ASTRONOMY DATA CENTRE  *******************
 **************  CENTRE CANADIEN DE DONNÉES ASTRONOMIQUES  **************
 *
 *  (c) 2016.                            (c) 2016.
 *  Government of Canada                 Gouvernement du Canada
 *  National Research Council            Conseil national de recherches
 *  Ottawa, Canada, K1A 0R6              Ottawa, Canada, K1A 0R6
 *  All rights reserved                  Tous droits réservés
 *
 *  NRC disclaims any warranties,        Le CNRC dénie toute garantie
 *  expressed, implied, or               énoncée, implicite ou légale,
 *  statutory, of any kind with          de quelque nature que ce
 *  respect to the software,             soit, concernant le logiciel,
 *  including without limitation         y compris sans restriction
 *  any warranty of merchantability      toute garantie de valeur
 *  or fitness for a particular          marchande ou de pertinence
 *  purpose. NRC shall not be            pour un usage particulier.
 *  liable in any event for any          Le CNRC ne pourra en aucun cas
 *  damages, whether direct or           être tenu responsable de tout
 *  indirect, special or general,        dommage, direct ou indirect,
 *  consequential or incidental,         particulier ou général,
 *  arising from the use of the          accessoire ou fortuit, résultant
 *  software.  Neither the name          de l'utilisation du logiciel. Ni
 *  of the National Research             le nom du Conseil National de
 *  Council of Canada nor the            Recherches du Canada ni les noms
 *  names of its contributors may        de ses  participants ne peuvent
 *  be used to endorse or promote        être utilisés pour approuver ou
 *  products derived from this           promouvoir les produits dérivés
 *  software without specific prior      de ce logiciel sans autorisation
 *  written permission.                  préalable et particulière
 *                                       par écrit.
 *
 *  This file is part of the             Ce fichier fait partie du projet
 *  OpenCADC project.                    OpenCADC.
 *
 *  OpenCADC is free software:           OpenCADC est un logiciel libre ;
 *  you can redistribute it and/or       vous pouvez le redistribuer ou le
 *  modify it under the terms of         modifier suivant les termes de
 *  the GNU Affero General Public        la “GNU Affero General Public
 *  License as published by the          License” telle que publiée
 *  Free Software Foundation,            par la Free Software Foundation
 *  either version 3 of the              : soit la version 3 de cette
 *  License, or (at your option)         licence, soit (à votre gré)
 *  any later version.                   toute version ultérieure.
 *
 *  OpenCADC is distributed in the       OpenCADC est distribué
 *  hope that it will be useful,         dans l’espoir qu’il vous
 *  but WITHOUT ANY WARRANTY;            sera utile, mais SANS AUCUNE
 *  without even the implied             GARANTIE : sans même la garantie
 *  warranty of MERCHANTABILITY          implicite de COMMERCIALISABILITÉ
 *  or FITNESS FOR A PARTICULAR          ni d’ADÉQUATION À UN OBJECTIF
 *  PURPOSE.  See the GNU Affero         PARTICULIER. Consultez la Licence
 *  General Public License for           Générale Publique GNU Affero
 *  more details.                        pour plus de détails.
 *
 *  You should have received             Vous devriez avoir reçu une
 *  a copy of the GNU Affero             copie de la Licence Générale
 *  General Public License along         Publique GNU Affero avec
 *  with OpenCADC.  If not, see          OpenCADC ; si ce n’est
 *  <http://www.gnu.org/licenses/>.      pas le cas, consultez :
 *                                       <http://www.gnu.org/licenses/>.
 *
 *
 ************************************************************************
 */

package ca.nrc.cadc.web.selenium;

import ca.nrc.cadc.util.StringUtil;
import junit.framework.AssertionFailedError;
import org.openqa.selenium.*;
import org.openqa.selenium.interactions.Actions;
import org.openqa.selenium.remote.RemoteWebDriver;
import org.openqa.selenium.support.FindBy;
import org.openqa.selenium.support.ui.ExpectedCondition;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.Select;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.lang.reflect.Constructor;
import java.util.ArrayList;
import java.util.List;


public abstract class AbstractTestWebPage
{
    // One minute is just too long.
    static final long TIMEOUT_IN_SECONDS = 60L;

    static final By CADC_HEADER_LINK_SELECTOR = By.xpath("//p[@id='gcwu-title-in']/a[1]");
    static final By CADC_CANADA_SITE_LINK = By.linkText("Canada.gc.ca");
    static final By PARENT_ELEMENT_BY = By.xpath("..");

    protected WebDriver driver;

    @FindBy(xpath = "//*[@id=\"wb-main-in\"]/div[1]/h2")
    private WebElement pageTitleHeader;

    @FindBy(linkText = "Canada.gc.ca")
    private WebElement canadaGCCALink;


    public AbstractTestWebPage(final WebDriver driver)
    {
        this.driver = driver;
    }


    public String getPageTitleHeader()
    {
        return pageTitleHeader.getText();
    }

    /**
     * Only used for CADC pages as they have this link on all pages.
     *
     * @return String text.
     * @throws Exception For any test execution exceptions
     */
    public String getHeaderLinkText() throws Exception
    {
        waitForElementPresent(CADC_HEADER_LINK_SELECTOR);
        return find(CADC_HEADER_LINK_SELECTOR).getText();
    }

    public AbstractTestWebPage clickCanadaSiteLink() throws Exception
    {
        waitForElementPresent(CADC_CANADA_SITE_LINK);
        click(canadaGCCALink);

        return new AbstractTestWebPage(driver)
        {
        };
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

    protected void inputTextValue(final By by, final String value) throws Exception
    {
        inputTextValue(by, value, true);
    }

    protected void clearTextInput(final By by) throws Exception
    {
        final WebElement inputElement = waitUntil(ExpectedConditions.presenceOfElementLocated(by));

        // Focus issues.
        hover(by);
        inputElement.click();
        inputElement.clear();
    }

    protected void inputTextValue(final By by, final String value, final boolean clean) throws Exception
    {
        inputTextValue(by, value, clean, true);
    }

    protected void inputTextValue(final By by, final String value, final boolean clean, final boolean moveToInput)
            throws Exception
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

    /**
     * Allow waiting for less than a second.
     *
     * @param milliseconds Time in milliseconds to wait.
     * @throws Exception For any test execution errors
     */
    protected void waitFor(final long milliseconds) throws Exception
    {
        Thread.sleep(milliseconds);
    }

    /**
     * Select in a pulldown.
     *
     * @param by    The finder element.
     * @param value The value to set.
     * @throws Exception For any test execution exceptions
     */
    public void select(final By by, final String value) throws Exception
    {
        final Select select = new Select(find(by));
        select.selectByValue(value);
    }

    public WebElement findParent(final WebElement childElement) throws Exception
    {
        return childElement.findElement(PARENT_ELEMENT_BY);
    }

    public WebElement find(final By by) throws Exception
    {
        try
        {
            return driver.findElement(by);
        }
        catch (Throwable e)
        {
            System.out.println("No element found: " + by.toString());
            return null;
        }
    }

    public void sendKeys(final WebElement webElement, final String value) throws Exception
    {
        webElement.clear();
        webElement.sendKeys(Keys.BACK_SPACE);
        webElement.sendKeys(value);
    }

    public void click(final By by) throws Exception
    {
        waitForElementPresent(by);
        click(find(by));
    }

    public void click(final WebElement elem) throws Exception
    {
        final Actions action = new Actions(driver);
        scrollIntoView(elem);
        waitForElementClickable(elem);
        action.moveToElement(elem).click(elem).build().perform();
    }

    public void resetForm() throws Exception
    {
        resetForm(By.cssSelector("input[type=\"reset\"]"));
    }

    public void resetForm(final By resetButtonBy) throws Exception
    {
        click(resetButtonBy);
    }

    public <T extends AbstractTestWebPage> T goBack(final Class<T> pageClass) throws Exception
    {
        driver.navigate().back();
        final Constructor<T> constructor = pageClass.getConstructor(WebDriver.class);
        return constructor.newInstance(driver);
    }

    public void verifyElementChecked(final By by) throws Exception
    {
        verifyTrue(find(by).isSelected());
    }

    public void verifyElementUnChecked(final By by) throws Exception
    {
        verifyFalse(find(by).isSelected());
    }

    public boolean elementExists(final By by) throws Exception
    {
        return (find(by) != null);
    }

    public void verifyElementPresent(final By by) throws Exception
    {
        final WebElement webElement = find(by);
        verifyFalse(webElement == null);
    }

    public void verifyDisabledInput(final String idSelector) throws Exception
    {
        final Object obj = executeJavaScript("return document.getElementById('" + idSelector + "').disabled;");
        verifyTrue((obj != null) && ((Boolean) obj));
    }

    public void verifyElementNotPresent(final By by) throws Exception
    {
        verifyTrue((find(by) == null));
    }

    /**
     * Issue a drag and drop command.
     *
     * @param source      The source element.
     * @param destination The to (target) element to drop into.
     */
    protected void dragAndDrop(final By source, final By destination) throws Exception
    {
        (new Actions(driver)).dragAndDrop(find(source), find(destination)).perform();
    }

    protected void scrollIntoView(final WebElement element) throws Exception
    {
        executeJavaScript("arguments[0].scrollIntoView(true);", element);
    }

    /**
     * Scroll a container (e.g. div) until the element with elementID is
     * visible.
     *
     * @param elementID           The ID of the element to find.
     * @param containerToScrollID The container to scroll.
     * @throws Exception For any test execution errors
     */
    protected void scrollVerticallyIntoView(final String elementID, final String containerToScrollID) throws Exception
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
     * <p>
     * TODO - Make this fail if at bottom of grid and still haven't
     * TODO - found target!!!
     *
     * @param elementIDToScroll The ID of the container.
     * @throws Exception For any test execution errors
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
     * @throws Exception For any test execution errors
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

    public void waitForTextPresent(final By by, final String text) throws Exception
    {
        waitForElementVisible(by);
        waitUntil(ExpectedConditions.textToBePresentInElementLocated(by, text));
    }

    public void verifyTextPresent(final By by, final String value) throws Exception
    {
        verifyTextPresent(find(by), value);
    }

    public void verifyTextPresent(final WebElement webElement, final String value) throws Exception
    {
        verifyTrue(webElement.getText().contains(value));
    }

    protected void verifyTextMatches(final By by, final String regex) throws Exception
    {
        verifyTrue(getText(by).matches(regex));
    }

    public void verifyText(final By by, final String value) throws Exception
    {
        verifyEquals(value, getText(by));
    }

    protected String getText(final By by) throws Exception
    {
        return find(by).getText();
    }

    protected boolean isTextPresent(final String text) throws Exception
    {
        return driver.getPageSource().contains(text);
    }

    public void verifyTextPresent(final String text) throws Exception
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

    protected void waitForFormInputTextPresent(final WebElement webElement, final String text) throws Exception
    {
        waitUntil(ExpectedConditions.textToBePresentInElementValue(webElement, text));
    }

    protected void hover(final By by) throws Exception
    {
        waitForElementPresent(by);
        waitForElementVisible(by);
        waitForElementClickable(by);

        // Wicked hack.  I hate this.
        // jenkinsd 2014.04.10
        //
        if (getInternetBrowserCommand().contains("afari"))
        {
            final String byString = by.toString();
            final String value = byString.substring(byString.indexOf(":") + 1).trim();
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

            executeJavaScript("$(" + locatorPrefix + value + locatorSuffix + ").hover();");
        }
        else
        {
            hover(find(by));
        }
    }

    protected Object executeJavaScript(final String javaScript, final WebElement webElement) throws Exception
    {
        return ((JavascriptExecutor) driver).executeScript(javaScript, webElement);
    }

    public final Object executeJavaScript(final String javaScript) throws Exception
    {
        return ((JavascriptExecutor) driver).executeScript(javaScript);
    }

    protected void hover(final WebElement element) throws Exception
    {
        final Actions action = new Actions(driver);
        action.moveToElement(element).build().perform();
    }

    protected boolean isElementHidden(final WebElement element) throws Exception
    {
        return !element.isDisplayed();
    }

    protected void waitForElementVisible(final WebElement element) throws Exception
    {
        assert (waitUntil(ExpectedConditions.visibilityOf(element)) != null);
    }

    protected void waitForElementVisible(final By by) throws Exception
    {
        assert (waitUntil(ExpectedConditions.visibilityOfElementLocated(by)) != null);
    }

    protected void waitForElementInvisible(final WebElement webElement) throws Exception
    {
        final List<WebElement> elementList = new ArrayList<>();
        elementList.add(webElement);

        assert (waitUntil(ExpectedConditions.invisibilityOfAllElements(elementList)));
    }

    protected void waitForElementInvisible(final By by) throws Exception
    {
        assert (waitUntil(ExpectedConditions.invisibilityOfElementLocated(by)) != null);
    }

    public WebElement waitForElementPresent(final By by) throws Exception
    {
        return waitUntil(ExpectedConditions.presenceOfElementLocated(by));
    }

    public void waitForElementNotPresent(final By by) throws Exception
    {
        waitUntil(ExpectedConditions.invisibilityOfElementLocated(by));
    }

    public void waitForElementClickable(final By _by) throws Exception
    {
        waitForElementClickable(find(_by));
    }

    public void waitForElementClickable(final WebElement element) throws Exception
    {
        assert (waitUntil(ExpectedConditions.elementToBeClickable(element)) != null);
    }

    protected <V> V waitUntil(final ExpectedCondition<V> expectedCondition) throws Exception
    {
        final WebDriverWait webDriverWait = new WebDriverWait(driver, TIMEOUT_IN_SECONDS);
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

    protected String getInternetBrowserCommand()
    {
        final Capabilities caps = ((RemoteWebDriver) driver).getCapabilities();
        return caps.getBrowserName();
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
}
