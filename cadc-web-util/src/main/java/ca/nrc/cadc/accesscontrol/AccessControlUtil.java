package ca.nrc.cadc.accesscontrol;

import ca.nrc.cadc.config.ApplicationConfiguration;
import ca.nrc.cadc.util.StringUtil;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

import org.apache.log4j.Logger;


public class AccessControlUtil
{
    private static final Logger LOG = Logger.getLogger(AccessControlUtil.class);
    public static final String SSO_COOKIE_NAME = "CADC_SSO";
    static final String SSO_SERVERS_KEY = "SSO_SERVERS";
    public static final String DEFAULT_AC_PROPERTIES_FILE_PATH =
            System.getProperty("user.home") + "/config/AccessControl.properties";
    private final ApplicationConfiguration applicationConfiguration;


    public AccessControlUtil(ApplicationConfiguration applicationConfiguration)
    {
        this.applicationConfiguration = applicationConfiguration;
    }

    /**
     * Load from the given file path as well as the System properties.
     * @param filePath      Path to a known configuration file.
     */
    public AccessControlUtil(final String filePath)
    {
        this(new ApplicationConfiguration(filePath));
    }

    /**
     * Load from the default file path.
     */
    public AccessControlUtil()
    {
        this(DEFAULT_AC_PROPERTIES_FILE_PATH);
    }


    public Set<String> getSSOServers()
    {
        final Set<String> servers = new HashSet<>();
        final String hostsString =
                applicationConfiguration.lookup(SSO_SERVERS_KEY);

        if (StringUtil.hasText(hostsString))
        {
            final String[] hosts = hostsString.split(" ");

            for (final String host : hosts)
            {
                if (StringUtil.hasLength(host))
                {
                    servers.add(host);
                }
            }
        }

        return servers;
    }
}
