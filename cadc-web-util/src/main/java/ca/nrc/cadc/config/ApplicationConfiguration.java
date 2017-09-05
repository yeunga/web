package ca.nrc.cadc.config;


import ca.nrc.cadc.util.StringUtil;

import java.net.URI;
import java.util.NoSuchElementException;

import org.apache.commons.configuration2.CombinedConfiguration;
import org.apache.commons.configuration2.Configuration;
import org.apache.commons.configuration2.PropertiesConfiguration;
import org.apache.commons.configuration2.SystemConfiguration;
import org.apache.commons.configuration2.builder.FileBasedConfigurationBuilder;
import org.apache.commons.configuration2.builder.fluent.Parameters;
import org.apache.commons.configuration2.ex.ConfigurationException;
import org.apache.log4j.Logger;


public class ApplicationConfiguration
{
    private static final Logger LOGGER = Logger
            .getLogger(ApplicationConfiguration.class);
    private final CombinedConfiguration configuration;

    public ApplicationConfiguration(final String filePath)
    {
        this();

        final Parameters parameters = new Parameters();
        final FileBasedConfigurationBuilder builder =
                new FileBasedConfigurationBuilder<>(
                        PropertiesConfiguration.class)
                        .configure(parameters.properties()
                                           .setFileName(filePath));

        try
        {
            configuration.addConfiguration((Configuration) builder
                    .getConfiguration());
        }
        catch (ConfigurationException var5)
        {
            LOGGER.warn(String.format(
                    "No configuration found at %s.\nUsing defaults.",
                    filePath));
        }

    }

    /**
     * System property-only configuration.
     */
    public ApplicationConfiguration()
    {
        this.configuration = new CombinedConfiguration();
        configuration.addConfiguration(new SystemConfiguration());
    }

    public void setThrowExceptionOnMissing(boolean throwExceptionOnMissing)
    {
    	this.configuration.setThrowExceptionOnMissing(throwExceptionOnMissing);
    }
    
    public boolean isThrowExceptionOnMissing()
    {
    	return this.configuration.isThrowExceptionOnMissing();
    }
    
    public URI lookupServiceURI(String key, URI defaultValue)
    {
        final String value = this.lookup(key);
        return StringUtil.hasText(value) ? URI.create(value) : defaultValue;
    }

    public int lookupInt(String key, int defaultValue)
    {
        return configuration.getInt(key, defaultValue);
    }

    public boolean lookupBoolean(String key, boolean defaultValue)
    {
        return configuration.getBoolean(key, defaultValue);
    }

    public String lookup(String key, String defaultValue)
    {
    	String value = configuration.getString(key, defaultValue);
    	this.checkValue(key, value);
        return value;
    }

    @SuppressWarnings("unchecked")
    public <T> T lookup(String key)
    {
    	T value = (T) configuration.getProperty(key);
    	this.checkValue(key, value);
        return value;
    }
    
    /* For some reason, CombinedConfiguration does not throw NoSuchElementException
     * when the throwExceptionOnMissing flag is set. Simulate similar behaviour
     * with this method.
     */
    private void checkValue(final String key, final Object value)
    {
    	if ((value == null) && (this.isThrowExceptionOnMissing()))
    	{
    		throw new NoSuchElementException("Property " + key + " does not exist.");
    	}
    }
}
