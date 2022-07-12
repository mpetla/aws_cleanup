const AWS = require('aws-sdk');
AWS.config.update({region:'us-east-1'});

const getAllRegionsNames = () => {
    const ec2 = new AWS.EC2();
    
    return ec2.describeRegions({}).promise()
        .then(data => data.Regions.map(region => ({ regionName: region.RegionName })))
}

const getRegionDependencies = (region) => {
    const ec2 = new AWS.EC2({region});
    const dependencies = [];
    const emptyParameters = {};
    
    dependencies.push(ec2.describeInternetGateways(emptyParameters).promise());
    dependencies.push(ec2.describeSubnets(emptyParameters).promise());
    dependencies.push(ec2.describeRouteTables(emptyParameters).promise());
    dependencies.push(ec2.describeNetworkAcls(emptyParameters).promise());
    dependencies.push(ec2.describeVpcPeeringConnections(emptyParameters).promise());
    dependencies.push(ec2.describeVpcEndpoints(emptyParameters).promise());
    dependencies.push(ec2.describeNatGateways(emptyParameters).promise());
    dependencies.push(ec2.describeSecurityGroups(emptyParameters).promise());
    dependencies.push(ec2.describeInstances(emptyParameters).promise());
    dependencies.push(ec2.describeVpnConnections(emptyParameters).promise());
    dependencies.push(ec2.describeVpnGateways(emptyParameters).promise());
    dependencies.push(ec2.describeNetworkInterfaces(emptyParameters).promise());

    return Promise.all(dependencies)
        .then(([
            describeInternetGateways,
            describeSubnets,
            describeRouteTables,
            describeNetworkAcls,
            describeVpcPeeringConnections,
            describeVpcEndpoints,
            describeNatGateways,
            describeSecurityGroups,
            describeInstances,
            describeVpnConnections,
            describeVpnGateways,
            describeNetworkInterfaces
        ]) => ({
            InternetGateways: describeInternetGateways.InternetGateways,
            Subnets: describeSubnets.Subnets,
            RouteTables: describeRouteTables.RouteTables,
            NetworkAcls: describeNetworkAcls.NetworkAcls,
            VpcPeeringConnections: describeVpcPeeringConnections.VpcPeeringConnections,
            VpcEndpoints: describeVpcEndpoints.VpcEndpoints,
            NatGateways: describeNatGateways.NatGateways,
            SecurityGroups: describeSecurityGroups.SecurityGroups,
            Reservations: describeInstances.Reservations,
            VpnConnections: describeVpnConnections.VpnConnections,
            VpnGateways: describeVpnGateways.VpnGateways,
            NetworkInterfaces: describeNetworkInterfaces.NetworkInterfaces       
        }));
}

const getRegionVpcs = (region) => {
    const ec2 = new AWS.EC2({region});

    return ec2.describeVpcs({}).promise().then(result => result.Vpcs.map(vpc => vpc.VpcId));
}

const getRegionResources = (region) => {
    const resources = [
        getRegionVpcs(region),
        getRegionDependencies(region),
        Promise.resolve(region)
    ];

    return Promise.all(resources)
        .then(([
            Vpcs,
            Dependencies,
            Region
        ]) => ({
            Vpcs,
            Dependencies,
            Region
        }));
}

const getRegionsResources = (regions) => {
    const regionsResources = [];

    regions.forEach(region => regionsResources.push(getRegionResources(region.regionName)));

    return Promise.all(regionsResources);
}

const deleteSecurityGroups = (ec2, securityGroups) => {
    const deleteRequestst = [];

    securityGroups.forEach(securityGroup => {
        const { GroupId } = securityGroup;

        deleteRequestst.push(ec2.deleteSecurityGroup({GroupId}).promise());        
    });

    return Promise.all(deleteRequestst);    
}

const deleteRouteTables = (ec2, routeTables) => {
    const deleteRequestst = [];

    routeTables.forEach(routeTable => {
        const { RouteTableId } = routeTable;

        deleteRequestst.push(ec2.deleteRouteTable({RouteTableId}).promise());        
    });

    return Promise.all(deleteRequestst);    
}

const deleteSubnets = (ec2, subnets) => {
    const deleteRequestst = [];

    subnets.forEach(subnet => {
        const { SubnetId } = subnet;

        deleteRequestst.push(ec2.deleteSubnet({SubnetId}).promise());        
    });

    return Promise.all(deleteRequestst);    
}

const deleteNetworkInterfaces = (ec2, networkInterfaces) => {
    const deleteRequestst = [];

    console.log(networkInterfaces);

    networkInterfaces.forEach(networkInterface => {
        const { NetworkInterfaceId } = networkInterface;

        if (networkInterface.Attachment) {
            const { AttachmentId } = networkInterfaces.Attachment;
            ec2.detachNetworkInterface({AttachmentId}).promise()
                .then(() => {
                    deleteRequestst.push(ec2.deleteNetworkInterface({NetworkInterfaceId}).promise());
                });
        } else {
            deleteRequestst.push(ec2.deleteNetworkInterface({NetworkInterfaceId}).promise());
        }
    });

    return Promise.all(deleteRequestst);  
}

const deleteVpcEndpoints = (ec2, vpcEndpoints) => {
    const deleteRequestst = [];

    vpcEndpoints.forEach(vpcEndpoint => {
        const { VpcEndpointId } = vpcEndpoint;

        deleteRequestst.push(ec2.deleteVpcEndpoint({VpcEndpointId}).promise());        
    });

    return Promise.all(deleteRequestst);    
}

const deleteVpnConnections = (ec2, vpnConnections) => {
    const deleteRequestst = [];

    vpnConnections.forEach(vpnConnection => {
        const { VpnConnectionId } = vpnConnection;

        deleteRequestst.push(ec2.deleteVpnConnection({VpnConnectionId}).promise());        
    });

    return Promise.all(deleteRequestst);    
}

const deleteVpcPeeringConnections = (ec2, vpcPeeringConnections) => {
    const deleteRequestst = [];

    vpcPeeringConnections.forEach(vpcPeeringConnection => {
        const { VpcPeeringConnectionId } = vpcPeeringConnection;

        deleteRequestst.push(ec2.deleteVpcPeeringConnection({VpcPeeringConnectionId}).promise());        
    });

    return Promise.all(deleteRequestst);    
}

const terminateInstances = (ec2, reservations) => {
    const terminateRequestst = [];

    reservations.forEach(reservation => {
        reservation.Instances.forEach(instance => {
            const { InstanceId } = instance;

            terminateRequestst.push(ec2.terminateInstances({InstanceIds: [InstanceId]}).promise());
        });
    });

    return Promise.all(terminateRequestst);    
}

const deleteVpnGateways = (ec2, vpnGateways) => {
    const deleteRequestst = [];

    vpnGateways.forEach(vpnGateway => {
        const { VpnGatewayId } = vpnGateway;

        deleteRequestst.push(ec2.deleteVpnGateway({VpnGatewayId}).promise());        
    });

    return Promise.all(deleteRequestst);    
}

const deleteNatGateways = (ec2, natGateways) => {
    const deleteRequestst = [];

    natGateways.forEach(natGateway => {
        const { NatGatewayId } = natGateway;

        deleteRequestst.push(ec2.deleteNatGateway({NatGatewayId}).promise());        
    });

    return Promise.all(deleteRequestst);    
}

const deleteInternetGateways = (ec2, internetGateways) => {
    const deleteRequestst = [];
    const detachRequests = [];
    
    internetGateways.forEach(internetGateway => {
        const { InternetGatewayId } = internetGateway;

        internetGateway.Attachments.forEach(attachment => {
            const { VpcId } = attachment;
            detachRequests.push(ec2.detachInternetGateway({InternetGatewayId, VpcId}).promise());
        });

        Promise.all(detachRequests)
            .then(deleteRequestst.push(ec2.deleteInternetGateway({InternetGatewayId}).promise()));        
    });

    return Promise.all(deleteRequestst);
}

const deleteDependencies = (regionResource) => {
    const ec2 = new AWS.EC2({region: regionResource.Region});

    return terminateInstances(ec2, regionResource.Dependencies.Reservations)
        .then(() => deleteVpcEndpoints(ec2, regionResource.Dependencies.VpcEndpoints))
        .then(() => deleteVpnConnections(ec2, regionResource.Dependencies.VpnConnections))
        .then(() => deleteVpcPeeringConnections(ec2, regionResource.Dependencies.VpcPeeringConnections))
        .then(() => deleteVpnGateways(ec2, regionResource.Dependencies.VpnGateways))
        .then(() => deleteNatGateways(ec2, regionResource.Dependencies.NatGateways))
        .then(() => deleteInternetGateways(ec2, regionResource.Dependencies.InternetGateways))
        .then(() => deleteNetworkInterfaces(ec2, regionResource.Dependencies.NetworkInterfaces))
        .then(() => deleteSubnets(ec2, regionResource.Dependencies.Subnets))
        .then(() => deleteRouteTables(ec2, regionResource.Dependencies.RouteTables))
        .then(() => deleteSecurityGroups(ec2, regionResource.Dependencies.SecurityGroups));
}

const deleteVpcs = (regionResource) => {
    const ec2 = new AWS.EC2({region: regionResource.Region});
    const deleteRequests = [];

    regionResource.Vpcs.forEach(vpc => {
        deleteRequests.push(ec2.deleteVpc({VpcId: vpc}).promise());
    });

    return deleteRequests;
}

const deleteRegionsResources = (regionResources) => {
    const deleteRequests = [];

    regionResources.forEach(regionResource => {
        deleteRequests.push(deleteDependencies(regionResource));
        deleteRequests.push(deleteVpcs(regionResource));
    });

    return Promise.all(deleteRequests);
}

getAllRegionsNames()
    .then(getRegionsResources)
    .then(deleteRegionsResources)
    .catch(console.log);
