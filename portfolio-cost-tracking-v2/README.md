#Portfolio Cost Tracking (v2)

As a portfolio manager I would like to see the cost of the work, and even how that cost is broken down based on a release or a parent, across many teams that may have different costs.  

The returned data set or Portfolio Items includes Portfolio Items of the selected type who's Actual End Date or Planned End Date (if Actual End Date is not populated) falls within the selected date range.  

![ScreenShot](/images/grid.png)

###App Settings
Configuring the Portfolio Item Cost Tracking App

 ![ScreenShot](/images/app_settings.png)

######Currency
Determines which currency sign to display next to calculated costs.  

######Calculate Preliminary Budget using
Determines which field to use to calculate the Preliminary Budget.  

The preliminary budget will be calculated for the lowest level portfolio item by multiplying the value of the selected field by the current Cost per Unit for the project of the item. 

For upper level portfolio items, the preliminary budget will be the rollup of the portfolio item's children, NOT based on the value of the preliminary budget field for the upper level portfolio item.  

If there are no lowest level portfolio items or the selected field value for all of them is null, then -- will be displayed.  

######Calculate Cost
Determines how to calculate total, actual and remaining costs.  Please see the details below for each option (Story Points, Task Actuals).

######Normalized Cost Per Unit
Cost per unit to use for calculating all costs where a specific project cost per unit is not specified.  

######Exceptions to the normalized cost
To specify project costs different than the value in the Normalized Cost Per Unit, use the Team Cost Admin app to store current and historical costs for a specific team.  

###Cost Calcuation type details
For all Cost Calculation options, the following definition applies:
Cost Per Unit = Cost per unit for the current project scope.  
If the cost per unit is defined for the specific project using the Team Cost Admin app, then that number will be used.  Otherwise, the Normalized Cost Per Unit will be used. 

The cost per unit used for a team where an exception is defined will be the cost of the team on the day that the story was accepted.  If the story is not accepted, then the cost per unit will
be the current cost of the team.  

####Based On Story Points
When Based On Story Points, the costs are calculated as followed:

* Total Projected Cost:  Story Plan Estimate Total * Cost Per Unit
* Actual Cost: Accepted Story Plan Estimate Total * Cost Per Unit
* Remaining Cost: Total Projected - Actual Cost

If there are no stories associated with the feature, or if the stories associated with the feature have no estimates, the costs associated with those stories will be 0.

####Based On Task Actuals
When Based On Task Actuals, the costs are calculated as followed:

* Total Projected Cost:  Task Estimate Total * Cost Per Unit
* Actual Cost: Task Actual Total * Cost Per Unit
* Remaining Cost: (ToDo) Task Remaining Total * Cost Per Unit

What if TaskActuals aren't turned on for my project? 
If task actuals aren't turned on for your current project, there will be a warning banner and any task actual calculations for that project will be 0.  

## License

AppTemplate is released under the MIT license.  See the file [LICENSE](./LICENSE) for the full text.

## Development Notes

### First Load

If you've just downloaded this from github and you want to do development, 
you're going to need to have these installed:

 * node.js
 * grunt-cli
 * grunt-init
 
Since you're getting this from github, we assume you have the command line
version of git also installed.  If not, go get git.

If you have those three installed, just type this in the root directory here
to get set up to develop:

  npm install

### Structure

  * src/javascript:  All the JS files saved here will be compiled into the 
  target html file
  * src/style: All of the stylesheets saved here will be compiled into the 
  target html file
  * test/fast: Fast jasmine tests go here.  There should also be a helper 
  file that is loaded first for creating mocks and doing other shortcuts
  (fastHelper.js) **Tests should be in a file named <something>-spec.js**
  * test/slow: Slow jasmine tests go here.  There should also be a helper
  file that is loaded first for creating mocks and doing other shortcuts 
  (slowHelper.js) **Tests should be in a file named <something>-spec.js**
  * templates: This is where templates that are used to create the production
  and debug html files live.  The advantage of using these templates is that
  you can configure the behavior of the html around the JS.
  * config.json: This file contains the configuration settings necessary to
  create the debug and production html files.  
  * package.json: This file lists the dependencies for grunt
  * auth.json: This file should NOT be checked in.  Create this to create a
  debug version of the app, to run the slow test specs and/or to use grunt to
  install the app in your test environment.  It should look like:
    {
        "username":"you@company.com",
        "password":"secret",
        "server": "https://rally1.rallydev.com"
    }
  
### Usage of the grunt file
####Tasks
    
##### grunt debug

Use grunt debug to create the debug html file.  You only need to run this when you have added new files to
the src directories.

##### grunt build

Use grunt build to create the production html file.  We still have to copy the html file to a panel to test.

##### grunt test-fast

Use grunt test-fast to run the Jasmine tests in the fast directory.  Typically, the tests in the fast 
directory are more pure unit tests and do not need to connect to Rally.

##### grunt test-slow

Use grunt test-slow to run the Jasmine tests in the slow directory.  Typically, the tests in the slow
directory are more like integration tests in that they require connecting to Rally and interacting with
data.

##### grunt deploy

Use grunt deploy to build the deploy file and then install it into a new page/app in Rally.  It will create the page on the Home tab and then add a custom html app to the page.  The page will be named using the "name" key in the config.json file (with an asterisk prepended).

To use this task, you must create an auth.json file that contains the following keys:
{
    "username": "fred@fred.com",
    "password": "fredfredfred",
    "server": "https://us1.rallydev.com"
}

(Use your username and password, of course.)  NOTE: not sure why yet, but this task does not work against the demo environments.  Also, .gitignore is configured so that this file does not get committed.  Do not commit this file with a password in it!

When the first install is complete, the script will add the ObjectIDs of the page and panel to the auth.json file, so that it looks like this:

{
    "username": "fred@fred.com",
    "password": "fredfredfred",
    "server": "https://us1.rallydev.com",
    "pageOid": "52339218186",
    "panelOid": 52339218188
}

On subsequent installs, the script will write to this same page/app. Remove the
pageOid and panelOid lines to install in a new place.  CAUTION:  Currently, error checking is not enabled, so it will fail silently.

##### grunt watch

Run this to watch files (js and css).  When a file is saved, the task will automatically build and deploy as shown in the deploy section above.

