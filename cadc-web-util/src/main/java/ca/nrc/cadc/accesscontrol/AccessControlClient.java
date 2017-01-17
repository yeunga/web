package ca.nrc.cadc.accesscontrol;

import ca.nrc.cadc.auth.AuthMethod;
import ca.nrc.cadc.auth.AuthenticationUtil;
import ca.nrc.cadc.auth.HttpPrincipal;
import ca.nrc.cadc.net.HttpPost;
import ca.nrc.cadc.reg.Standards;
import ca.nrc.cadc.reg.client.RegistryClient;

import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.net.URI;
import java.net.URL;
import java.security.AccessControlException;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import javax.security.auth.Subject;


/**
 * Client to access a registered AC Web Service.
 */
public class AccessControlClient
{
    private final RegistryClient registryClient;
    private final URI groupManagementServiceURI;


    public AccessControlClient(final URI serviceURI)
            throws IllegalArgumentException
    {
        this(serviceURI, new RegistryClient());
    }

    AccessControlClient(URI serviceURI, RegistryClient registryClient)
    {
        this.registryClient = registryClient;
        this.groupManagementServiceURI = serviceURI;
    }


    /**
     * Obtain the Login URL.
     * @return      URL for login
     */
    private URL lookupLoginURL()
    {
        return this.registryClient
                .getServiceURL(this.groupManagementServiceURI,
                               Standards.UMS_LOGIN_01, AuthMethod.ANON);
    }

    public String login(final String username, char[] password)
    {
        final ByteArrayOutputStream out = new ByteArrayOutputStream();
        final Map<String, Object> payload = new HashMap<>();

        payload.put("username", username);
        payload.put("password", new String(password));

        final int statusCode = post(payload, out);
        switch (statusCode)
        {
            case 200:
            {
                return out.toString();
            }

            case 401:
            {
                throw new AccessControlException("Login denied");
            }

            default:
            {
                throw new IllegalArgumentException(
                        String.format("Unable to login '%s'.\nServer error code: %d.",
                                      username, statusCode));
            }
        }
    }

    /**
     * Submit login data to the service.
     * @param payload       The payload information.
     * @param out           The response stream.
     * @return      Response status code.
     */
    int post(final Map<String, Object> payload, final OutputStream out)
    {
        final HttpPost post = new HttpPost(lookupLoginURL(), payload, out);
        post.run();
        return post.getResponseCode();
    }

    public String getCurrentHttpPrincipalUsername(Subject subject)
    {
        final AuthMethod authMethod = AuthenticationUtil.getAuthMethod(subject);
        String username;

        if ((authMethod != null) && (authMethod != AuthMethod.ANON))
        {
            final Set curPrincipals = subject.getPrincipals(HttpPrincipal.class);
            HttpPrincipal[] principalArray =
                    new HttpPrincipal[curPrincipals.size()];
            username = ((HttpPrincipal[]) curPrincipals
                    .toArray(principalArray))[0].getName();
        }
        else
        {
            username = null;
        }

        return username;
    }
}
