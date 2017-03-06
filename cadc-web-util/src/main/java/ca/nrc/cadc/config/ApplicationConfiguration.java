package ca.nrc.cadc.config;


import ca.nrc.cadc.util.StringUtil;

import java.net.URI;

import org.apache.commons.configuration2.CombinedConfiguration;
import org.apache.commons.configuration2.Configuration;
import org.apache.commons.configuration2.PropertiesConfiguration;
import org.apache.commons.configuration2.SystemConfiguration;
import org.apache.commons.configuration2.builder.BuilderParameters;
import org.apache.commons.configuration2.builder.FileBasedConfigurationBuilder;
import org.apache.commons.configuration2.builder.fluent.Parameters;
import org.apache.commons.configuration2.ex.ConfigurationException;
import org.apache.log4j.Logger;


public class ApplicationConfiguration
{
    private static final Logger LOGGER = Logger
            .getLogger(ApplicationConfiguration.class);
    final CombinedConfiguration configuration;

    public ApplicationConfiguration(final String filePath)
    {
        configuration = new CombinedConfiguration();

        final Parameters parameters = new Parameters();
        final FileBasedConfigurationBuilder builder =
                new FileBasedConfigurationBuilder<>(
                        PropertiesConfiguration.class)
                        .configure(parameters.properties()
                                           .setFileName(filePath));

        try
        {
            configuration.addConfiguration(new SystemConfiguration());
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
        return configuration.getString(key, defaultValue);
    }

    public <T> T lookup(String key)
    {
        return (T) configuration.getProperty(key);
    }
}
