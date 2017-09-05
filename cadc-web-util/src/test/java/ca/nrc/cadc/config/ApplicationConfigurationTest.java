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

package ca.nrc.cadc.config;

import java.io.File;
import java.io.FileOutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;

import org.apache.commons.configuration2.PropertiesConfiguration;
import org.apache.commons.configuration2.builder.FileBasedConfigurationBuilder;
import org.apache.commons.configuration2.builder.fluent.Parameters;
import org.junit.After;
import org.junit.Test;

import static org.junit.Assert.*;


public class ApplicationConfigurationTest
{
    @After
    public void reset() throws Exception
    {
        System.clearProperty(ApplicationConfiguration.class.getCanonicalName() + ".PROP1");
    }

    @Test
    public void pullSystemProperty() throws Exception
    {
        final File tmpConfigFile = File.createTempFile("config-", ".properties");
        final FileOutputStream fos = new FileOutputStream(tmpConfigFile);

        fos.write("PROP2=VAL2\n".getBytes("UTF-8"));
        fos.write((ApplicationConfiguration.class.getCanonicalName() + ".PROP1=VAL21").getBytes("UTF-8"));

        fos.flush();
        fos.close();

        System.setProperty(ApplicationConfiguration.class.getCanonicalName() + ".PROP1", "VAL1");

        final ApplicationConfiguration testSubject = new ApplicationConfiguration(tmpConfigFile.getPath());

        final Parameters parameters = new Parameters();

        final FileBasedConfigurationBuilder<PropertiesConfiguration> builder =
                new FileBasedConfigurationBuilder<>(
                        PropertiesConfiguration.class).configure(parameters.fileBased().setFile(tmpConfigFile));

        final List<String> results = testSubject.lookup(ApplicationConfiguration.class.getCanonicalName()
                                                        + ".PROP1");
        final List<String> expected = new ArrayList<>();

        expected.add("VAL1");
        expected.add("VAL21");

        assertEquals("Wrong value.", expected, results);
    }

    @Test
    public void pullFileProperty() throws Exception
    {
        final File tmpConfigFile = File.createTempFile("config-", ".properties");
        final FileOutputStream fos = new FileOutputStream(tmpConfigFile);

        fos.write("PROP2=VAL2\n".getBytes("UTF-8"));
        fos.write("PROP1=VAL11".getBytes("UTF-8"));

        fos.flush();
        fos.close();

        final ApplicationConfiguration testSubject = new ApplicationConfiguration(tmpConfigFile.getPath());
    	testSubject.setThrowExceptionOnMissing(true);
    	boolean isThrowException = testSubject.isThrowExceptionOnMissing();

        assertEquals("Wrong value.", "VAL11", testSubject.lookup("PROP1"));
        try
        {
        	Object val = testSubject.lookup("NOSUCHPROP");
        }
        catch (NoSuchElementException nsee)
        {
        	// expected
        }
    }

    @Test
    public void pullSinglePropertyFromMultiple() throws Exception
    {
        System.setProperty("PROP2", "VAL2X");

        final File tmpConfigFile = File.createTempFile("config-", ".properties");
        final FileOutputStream fos = new FileOutputStream(tmpConfigFile);

        fos.write("PROP2=VAL2\n".getBytes("UTF-8"));
        fos.write("PROP1=VAL11".getBytes("UTF-8"));

        fos.flush();
        fos.close();

        final ApplicationConfiguration testSubject = new ApplicationConfiguration(tmpConfigFile.getPath());
        final String result = testSubject.lookup("PROP2", "");

        assertEquals("Wrong value.", "VAL2X", result);
    }
}
