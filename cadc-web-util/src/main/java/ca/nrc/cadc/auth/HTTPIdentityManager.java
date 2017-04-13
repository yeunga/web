/*
 ************************************************************************
 *******************  CANADIAN ASTRONOMY DATA CENTRE  *******************
 **************  CENTRE CANADIEN DE DONNÉES ASTRONOMIQUES  **************
 *
 *  (c) 2017.                            (c) 2017.
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

package ca.nrc.cadc.auth;

import javax.security.auth.Subject;
import java.math.BigInteger;
import java.security.Principal;
import java.sql.PreparedStatement;
import java.sql.Types;
import java.util.Set;


public class HTTPIdentityManager implements IdentityManager
{
    /**
     * Create a subject from the specified owner object. This is the reverse
     * of toOwner(Subject). The returned subject must include at least one
     * Principal but need not contain any credentials.
     *
     * @param owner
     * @return
     */
    @Override
    public Subject toSubject(final Object owner)
    {
        return null;
    }

    /**
     * Convert the specified subject into an arbitrary object. This is the reverse
     * of toSubject(owner). The persistent object must capture the identity (the
     * principal from the subject) but generally does not capture the credentials.
     *
     * @param subject The Subject to check.
     * @return arbitrary owner object to be persisted
     */
    @Override
    public Object toOwner(final Subject subject)
    {
        final String ownerStringName = toOwnerString(subject);

        return (ownerStringName == null) ? null :
               new BigInteger(ownerStringName.getBytes());
    }

    @SuppressWarnings("unchecked")
    private <K extends Principal> String scanPrincipals(
            final Subject subject, final Class<K> principalClass)
    {
        final Set<K> principals = subject.getPrincipals(principalClass);

        if (principals.isEmpty())
        {
            return null;
        }
        else
        {
            return ((K) (principals.toArray()[0])).getName();
        }
    }

    /**
     * Get the SQL TYPE for the column that stores the object
     * returned by toOwner(Subject);
     *
     * @return a valid SQL type for use with a PreparedStatement
     * @see Types
     * @see PreparedStatement
     */
    @Override
    public int getOwnerType()
    {
        return Types.BIGINT;
    }

    /**
     * Convert the specified subject to a suitable string representation of the
     * owner. This should normally be an X509 distinguished name if IVOA
     * single-sign-on has been implemented.
     *
     * @param subject           The subject to scan.
     * @return string representation of the owner (principal)
     */
    @Override
    public String toOwnerString(Subject subject)
    {
        return (subject == null)
               ? null : scanPrincipals(subject, HttpPrincipal.class);
    }
}
