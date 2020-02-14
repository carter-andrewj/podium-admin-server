


// DATA STRUCTURES
//		Index		- a list of addresses referencing other entities of the same type
//		Merged		- data is stored in a pre-defined key-value map with the values
//					of newer atoms mergin with older ones
//		Collated	- each atom is a unique immutable record


// RECORD TYPES
//		String		- a text string, new records replace old ones
//		Sum			- an integer or float, new records are added together
//		Reference	- an address referencing another Entity
//		Content		- an object consisting of a text string and 0+ references
//					to entities cited in the string
//		URL			- a url
//		KeyPair		- an encrypted keypair object


// METHODS
//		Create		- first write to an entity



// TRAITS
//		Aliased		- Entity owns a single Alias NFT that can be used to reference it in Content
//		Profiled	- Entity has a Profile entity as a property and can call its methods directly
//		Proxy		- Entity allows its owner(s) to call its methods under certain conditions
//		Followable	- Entity can be followed by entities with the Following trait
//		Following	- Entity can follow entities with the Followable trait



let nation = {

	nation: {

		methods: {
			create: { allow: false },
			write: { allow: false },
			close: { allow: false },
		}

	},



	domain: {

		methods: {

			create: {
				allow: true,
				permissions: {

					a: {
						subjects: [ "owner" ],
						test: "isEntityTypeAmong",
						values: [ "citizen", "nation" ],
						commentary: "Only CITIZEN and NATION entities can create DOMAIN entities.",
					},

					b: {
						subjects: [ "owner" ],
						filter: [
							{
								test: "isEntityType",
								values: [ "citizen" ],
								commentary: "This test is only applied to CITIZEN entities.",
							}
						],
						test: "ownsEntityOfTypeWith",
						values: [
							"right",
							{
								properties: [ "id" ],
								test: "equality",
								values: [ "canCreateDomains" ],
							},
							{
								properties: [ "domain" ],
								test: "isCurrentDomain"
							},
						],
						commentary: "Only citizens owning a 'canCreateDomains' RIGHT can create DOMAINS."
					},

					c: {
						subjects: [ "owner" ],
						filter: [
							{
								test: "isEntityType",
								values: [ "nation" ],
								commentary: "This test is only applied to the NATION entity."
							}
						],
						test: "ownsNotEntityOfType",
						values: [ "domain" ],
						commentary: "The NATION entity can only create one DOMAIN entity."
					}

				},
			},

			write: { allow: false },

			close: {
				allow: true,
				permissions: [
					{
						subjects: [ "owner" ]
					}
				],
			},

		},

		data: {
			structure: "none"
		},

		// Traits of this entity
		traits: {

			aliased: {
				parameters: {
					markup: "/"
				}
			},

			profiled: {
				
			},

		},

		ownership: {

			type: "collective",

			methods: {

				transfer: {
					allow: true,
					permissions: [
						{
							type: "ownership",
							entityType: "permit",
							entityProperties: {
								subject: {
									test: "this"
								},
								expiry: {
									test: "inTheFuture",
								}
							}
						}
					]
				}

			}

		},

	},




	profile: {

		methods: {

			create: {
				allow: true,
				permissions: [
					{
						subject: "parent",
						test: "hasTrait",
						values: [ "profiled" ],
						commentary: "Only entities with the 'Profiled' trait can create PROFILE entities."
					},
					{
						subject: "parent",
						test: "hasNotChildOfType",
						values: [ "profile" ],
						commentary: "Entities can only create a PROFILE entity if they do not already have a PROFILE child."
					}
				],
			},

			write: {
				allow: true,
				permissions: [
					{
						subject: "authorizer",
						test: ""
					}
				]
			},

		},

		ownership: {
			type: "fixed"
		},

		data: {

			recipe: "merge",

			structure: {
				name: {
					type: "string",
					default: undefined,
				},
				picture: {
					type: "reference",
					default: undefined,
				},
				description: {
					type: "content",
					default: undefined,
				},
			},

			validate: [
				{
					subjects: [ "this:name" ],
					test: "maxLength",
					values: [ 30 ],
					allowUndefined: true,
				},
				{
					subject: [ "this:picture" ],
					test: "isEntityTypeAmong",
					values: [ "image" ],
					allowUndefined: true,
				},
				{
					subject: [ "this:description" ],
					test: "maxLength",
					values: [ 30 ],
					allowUndefined: true,
				},
			],

		},

	},





	citizen: {

		methods: {

			create: {
				allow: true,
				permissions: [{
					subject: "parent",
					test: "isEntityType",
					values: "nation",
					commentary: "All CITIZEN entities must be children of the global NATION entity."
				}]
			},

			write: { allow: false },

			close: { allow: false },

		},

		ownership: {
			owner: true
		},

		traits: {

			aliased: {
				parameters: {
					markup: "@"
				},
			},

			profiled: {},

			authenticating: {},

			followable: {},
			following: {},

		}

	},




	reputation: {

		methods: {

			create: {
				allow: true,
				permissions: [
					{
						entityType: "domain",
					}
				]
			},

			write: {
				allow: true,
				permissions: [
					{
						entityType: "petition",
						entityProperties: [
							{
								values: [ "delegate" ],
								test: "isCurrentIdentity"
							},
							{
								values: [ "result" ],
								test: "isPositive"
							},
							{
								values: [ "votes", "threshold" ],
								test: "isGreaterThan",
							}
						]
					}
				]
			},

			close: {
				allow: true,
				permissions: [
					{
						entityType: "petition",
						entityProperties: [
							{
								values: [ "delegate" ],
								test: "isCurrentIdentity"
							},
							{
								values: [ "result" ],
								test: "isNegative",
							},
							{
								values: [ "votes", "threshold" ],
								test: "isGreaterThan"
							}
						]
					}
				]
			},

		},

		data: {
			type: "merged",
			structure: {
				subject: {
					type: "entity",
					validate: [
						{
							values: [ "citizen", "authority" ],
							test: "isEntityType",
						}
					],
				},
			}
		}


	}

}