# Podium - Server


## Setup


### Requirements

The server currently requires [Node](https://nodejs.org/en/ "Node") (including [NPM](https://www.npmjs.com/ "Node Package Manager")) and [Docker](https://www.docker.com/ "Docker") (including [Compose](https://docs.docker.com/compose/install/ "Docker Compose")).


### Environment

Each instance of the server requires a `.env` file (not included in this repo for security reasons) of the format found in `template.env`, including:

-AWS Credentials - both key and secret key, for access to config files stored on S3
-Admin Name - an identifier used to flag Nations created from this server
-Admin Password - an access key for securing he admin portal for this server

A set of Podium AWS IAM keys can be provided upon request to those associated with the project. Alternatively - to use your own AWS account - a bespoke S3 bucket tree can be specified in `config.json`, along with logging outputs and server ports.


### Installation

After cloning the repo, modules dependencies can be installed by running:

   ```shell
   npm install
   ```


### Initialization

Before first startup, run the following command to set up the local file tree and Docker containers.

   ```shell
   npm run init
   ```

You can reset to this state at any time - clearing all logs, the database, ledger, and Nation restore files.

   ```shell
   npm run reset
   ```

Separate helper scripts for clearning each data store separately are defined in `package.json`.


### Running

Once initialized, the server can be started in Development Mode by running:

   ```shell
   npm start
   ```

Any changes to files, etc... will cause an automatic reload and resumption of any live Nation (stored in `restore.txt`).

Changes to a nation template (in the `templates` folder) require a hard stop (`CTRL-C`) and restart. This is because the server sources these templates from the central S3 store, so they need to be re-synced before loading (a task which occurs automatically on startup).

*Note: there is currently a bug with the Nodemon package that occassionally causes it to respond to a file change by restarting the server before the previous iteration has shut down. This will throw an error while the outgoing server is still using the required ports. This error can be fixed by stopping the server (`CTRL-C`) and restarting with `npm start`.*

The server can be started in Production Mode by running:

   ```shell
   npm start-production
   ```

Currently, the differences between Development and Production mode are limited to those optimisations offered by the various node package dependencies.


## Deployment

A complete guide to depolying a live version of this server codebase can be found [here](https://docs.google.com/document/d/1xbl5RfOGSvMjR38XJccnb3jLY_sbcnntSuGxOVEuIx0/edit "Server Deployment Walkthrough").



## Launching a Nation

A **Nation** is a single instance of a Podium network. Currently, the server can only support one **Nation** at a time.


### Admin Portal

Once the server is online you will see the following output:

   ```
   STARTING PODIUM SERVER
    -  Admin Console at [url]
   SERVER ONLINE
   ```

Navigating to the provided URL (typically [https://localhost:3210](https://localhost:3210) in Development Mode with the default `config.json`) will load the web portal and request the password you specified in your `.env` file. Entering that password will grant you access.

A new **Nation** can be launched by clicking `New` in the left-hand panel.

*Note: if a **Nation** is already live, the `New` button will be hidden in favour of `Stop` to stop serving the current **Nation**. Stopped **Nations** are not deleted and can be restarted via the `Resume` button next to `New`. Since Development Mode **Nations** use local data stores, they can only be resumed by the environment (`.env`) with the same Admin Name as the one that created them.*


### Constitution

After clicking `New` you will be presented with a selection of template **Constitutions** (i.e. **Nation** config files). There are currently 2:

- **Development** includes basic setup, a few basic bot accounts, and one mirror account (a bot that reposts the content of a specified account on Twitter)

- **Alpha** includes basic setup and a large selection of different mirror accounts.

Currently, bots can only post at regular intervals or mirror their counterparts on Twitter, greater functionality will be added as testing evolves. More bots - and their behaviours - can be defined by editing the `Population` section of the **Constitution**.

Selecting a **Constitution** will give you an opportunity to edit the template and will auto-generate a unique name for the Nation. If you do not wish to edit the **Constitution** simply click `Launch` in the top-right of the panel to start the creation process.


### Creation

It can take the server several minutes to create a new **Nation** depending on how many bots it is instructed to create. You do not need to take any action during this process, but can observe the steps by viewing the `Nation` logs at the top of the right-hand panel.

Once the setup is complete, the left-hand panel will switch the **Nation** status to `Live`, indicating that the server's websocket is now open for connections.

Stopping (or restarting) the server will automatically trigger a save of any live **Nation** and the server will automatically relaunch that **Nation** on next startup. This behaviour can be stopped by deleting `restore.txt` or by resetting the server (as described above).



## Services

The Server manages a number of services:

### Database

A basic in-memory database (currently [Loki](http://techfort.github.io/LokiJS/ "Loki.JS")) used for efficient search functionality and providing user alerts.


### Storage

An S3 store for files (images, videos) associated with (or uploaded to) the **Nation**.


### Ledger

A decentralized ledger (DLT; currently [Radix](https://www.radixdlt.com/ "Radix DLT")) for storing all Nation specific data - users, posts, tokens, reports, etc... - everything that will form part of the smart contract infrastructure of the full Podium network.

Each object on the ledger is considered an *Entity*. Entities share a base class which manages their individual ledger account and handles writing/reading from their store on the ledger and any related interactions with other services.

Every type of Entity is then comprised of that base class and a number of mixins dictating the behavioural traits of each Entity type. Currently, these traits include:

- ***Alertable*** - the Entity can send/receive alerts according to its interactions with other Entities.
- ***Authenticating*** - the Entity can write to the ledger.
- ***Economic*** - the Entity can create and manage Tokens.
- ***Followable*** - the Entity's activity can be subscribed to by Following Entities.
- ***Following*** - the Entity can subscribe to the activity of Followable Entities.
- ***Indexed*** - the Entity manages its data as an index of references to other Entities.
- ***Merged*** - the Entity manages its data as a single key-value map in which new values overwrite old ones.
- ***Ownable*** - the Entity can be traded between Owning Entities.
- ***Owning*** - the Entity can hold Ownable Entities.
- ***Posting*** - the Entity can create and manage Posts.
- ***Profiled*** - the Entity is described by a human-readble Profile.
- ***Reactable*** - the Entity can be reacted to by Reactive entities and keeps a record of its popularity.
- ***Reactive*** - the Entity can react to Reactable entities and keeps a record of its reactions (i.e. its bias).
- ***Respondable*** - the Entity can be replied to.
- ***Storable*** - the Entity corresponds to a file (e.g. an image) held in Storage and under it's Entity hash address.
- ***Transacting*** - the Entity can hold/send/receive Tokens.

*Note: other traits exist as files, but are not currently implemented.*

And they form the following types:

- **ALIAS** *(Ownable, Merged)* A tradeable asset representing an @ ID.
- **DOMAIN** *(Economic, Merged, Posting, Profiled)* A namespace within the Nation (represented by the // markup - e.g. //Podium). Domain have their own Tokens, Laws, and Subdomains (//Podium/Subdomain) which inherit the settings of their parents. In practice, the Nation itself is a root Domain holding the global Laws and Tokens.
- **KEYSTORE** *(no traits)* An encrypted on-ledger store for a private key, encrypted with the user's password and stored in an account derived from a seed of that password and the user's Alias. (A temporary solution to password recovery).
- **MEDIA** *(Storable)* An entity representing a media file (image, gif, video) uploaded to Podium whose ledger address is calculated from the hash of the file itself (meaning each unique piece of media is only represented once).
- **POST** *(Reactable, Respondable, Merged)* A single piece of content on Podium.
- **PROFILE** *(Merged)* A set of data describing the associated Entity.
- **TOPIC** *(Ownable, Posting, Followable, Profiled, Merged)* A tradeable asset representing a #Tag. Allows its owner to post on its behalf.
- **TOKEN** *(Merged)* A representation of a single Podium currency (i.e. ***POD*** or ***AUD***).
- **USER** *(Alertable, Authenticating, Followable, Following, Merged, Owning, Posting, Profiled, Reactive, Transacting)* Users are the digital identity of Podium members (the User Entity may be renamed Citizen in future to avoid ambiguity).

*Note: the various Index Entity types are self-explanatory and so not detailed here.*


### API

The app Websocket API is designed to mimic the internal API between *Entities* and the Ledger - in service to the long-term goal of having the app interact directly with the ledger itself.

Clients subscribe to connected Entities and receive real-time updates whenever that entity changes state. Traits also register certain "actions" that can be called by name via the universal `act` command.


### Admin API

A separate REST API for managing the Nation instead of interacting with it directly.

*Note: currently, this API only includes limited commands, but should be expanded to enable more detailed testing (e.g. sending a post) which currently has to be performed via the Websocket API, making testing more arduous.*

*Note: the Admin console itself is currently packaged with this codebase for simplicity, though it functions as a wholly separate piece of software. The core `npm start` command runs both the command to start the server and the command to launch the admin console.*


### Population

A basic bot server running automated accounts for development/testing purposes or as content generators for the alpha network.

*Note: bot behaviours are currently limited to creation and posting. Future bots will also be able to have behaviours defined to follow/unfollow, react to content, etc...*


### Logger

A custom logging system designed to maintain context in Entity space and interface directly with the **Nation**.

*Note: the Logger is only partially implemented and can only currently log to file or console, not proper storage (i.e. S3). The Admin console displays logs by reading from the log files - this also needs work and should be switched to a stream reader to stop long load times for large log files.* 