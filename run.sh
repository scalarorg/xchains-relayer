
update_gateway() {

    cat ./data/$ENV/evm.json| jq -c '.[]' | while read evm; do
    # for each chain in the evm.json file, find the chain id and gateway address 
    ID=$(echo $evm | jq -r '.id')
    ADDRESSES_FILE=./chains/${ID}/addresses.json

    GATEWAY=$(cat ${ADDRESSES_FILE} | jq -r '.gateway')

    echo "Update gateway address $GATEWAY for chain: $ID"

    # write the GATEWAY to the "gateway" field in the evm.json file
    jq --arg chain_id $ID --arg gateway $GATEWAY '( .[] | select(.id == $chain_id) ).gateway |= $gateway' ./data/$ENV/evm.json > ./data/$ENV/evm.json.tmp && mv ./data/$ENV/evm.json.tmp ./data/$ENV/evm.json

    done
}

local() {
    if [ -n "$ENV" ]; then
        echo "ENV is set to $ENV"
    else
        echo "ENV is not set"
        echo "Set default ENV to local"
        ENV=local
    fi

    rm -r data
    rm -r chains
    mkdir -p data/${ENV}

    cp ../.testnets/relayer/.env.${ENV} .env
    cp -r ../.testnets/relayer/data/${ENV} ./data
    cp -r ../.testnets/chains ./chains
    cp -r ../config/chains/${ENV} ./chains

    update_gateway

    find ./.env -type f -print0 | xargs -0 sed -i '' "s#DATABASE_URL=.*#DATABASE_URL=postgresql://postgres:postgres@localhost:5442/relayer#g"

    # replace all scalarnode1 with localhost
    find ./data/${ENV} -type f -print0 | xargs -0 sed -i '' "s#scalarnode1#localhost#g"

    # replace all scalarnode1 with localhost
    find ./data/${ENV}/evm.json -type f -print0 | xargs -0 sed -i '' "s#http://evm-anvil:8545#http://localhost:8545#g"

    find ./data/${ENV}/rabbitmq.json -type f -print0 | xargs -0 sed -i '' "s#\"host\": \".*\"#\"host\": \"localhost\"#g"

    echo "\nCONFIG_DIR=./chains" >> .env 
    echo "\nPORT=12345" >> .env

    ./entrypoint.sh 
}

local

$@
