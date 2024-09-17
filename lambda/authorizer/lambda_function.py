def lambda_handler(event, context):
    print(event)
    authResponse = {}
    authResponse['principalId'] = 'demo'
    authResponse['policyDocument'] = {
        'Version':'2012-10-17',
        'Statement':[
            {
                'Action': 'execute-api:Invoke',
                'Effect': 'Allow', 
                'Resource': '*'
            }
        ]
    }
    
    authResponse['policyDocument']['Statement'][0]['Resource'] = '*'
    print(authResponse)
    return authResponse