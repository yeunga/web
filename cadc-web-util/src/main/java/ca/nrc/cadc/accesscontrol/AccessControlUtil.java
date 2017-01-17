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
    private static final String DEFAULT_AC_PROPERTIES_FILE_PATH =
            System.getProperty("user.home") + "/config/AccessControl.properties";
    private final ApplicationConfiguration applicationConfiguration;


    public AccessControlUtil(ApplicationConfiguration applicationConfiguration)
    {
        this.applicationConfiguration = applicationConfiguration;
    }

    public AccessControlUtil()
    {
        this(new ApplicationConfiguration(DEFAULT_AC_PROPERTIES_FILE_PATH));
    }


    public Set<String> getSSOServers()
    {
        Set<String> servers = new HashSet<>();
        String hostsString =
                applicationConfiguration.lookup("SSO_SERVERS");

        if (StringUtil.hasText(hostsString))
        {
            final String[] hosts = hostsString.split(" ");
            servers.addAll(Arrays.asList(hosts));
        }

        return servers;
    }
}
