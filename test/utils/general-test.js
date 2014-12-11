var assert = require('assert'),
    proxyquire = require('proxyquire').noCallThru();

describe('general utilities', function() {

    describe('when initializing dynamic modules', function() {
        var general = proxyquire('./../../utils/general', {
            '../mockDir/a': 'a-mod', 
            '../mockDir/b': 'b-mod', 
            '../mockDir/c': 'c-mod', 
            '../mockDir/d': 'd-mod', 
            '../mockDir/e': 'e-mod',
            'fs': {
                readdirSync: function() {
                    return ['a.js','b.js','c.js','d.js','e.js']
                }
            },
            './repo-client': {}
        });
        it('loads all modules within directory', function() {
            var initialized = general.initializeModulesWithin('mockDir');
            assert.equal(initialized.length, 5, 'excluded modules were not excluded');
            assert.equal(initialized[0], 'a-mod', 'wrong modules returned');
            assert.equal(initialized[1], 'b-mod', 'wrong modules returned');
            assert.equal(initialized[2], 'c-mod', 'wrong modules returned');
            assert.equal(initialized[3], 'd-mod', 'wrong modules returned');
            assert.equal(initialized[4], 'e-mod', 'wrong modules returned');
        });
    });

    it('prevents passwords from showing up in sterilized configs', function() {
        var general = proxyquire('./../../utils/general', {
            'fs': {},
            './repoClient': {}
        });
        var config = {
            "monitors": {
                "project": {
                    "password": "tijj3UikYB9vmx"
                }
            }
        };
        var sterilized = general.sterilizeConfig(config);
        assert.equal('<hidden>', sterilized.monitors.project.password);
    });

});