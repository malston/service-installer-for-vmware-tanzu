# Copyright 2021 VMware, Inc.
# SPDX-License-Identifier: BSD-2-Clause
from flask import current_app

from common.operation.constants import AkoType, Env, Paths, SegmentsName, Type
from common.util.common_utils import CommonUtils
from common.util.file_helper import FileHelper


class DeploymentData:
    """
    base class for capturing deploy data related to clusters(workload/shared)
    """

    def __init__(self, spec, cluster_type):
        self.identity_mgmt_type = spec.identityManagementSpec.identityManagementType
        self.spec = spec
        self.ceip = ""
        self.proxy_cert = ""
        self.is_proxy_cert = ""
        self.cluster_type = cluster_type
        self.cluster_data = ""

    @staticmethod
    def os_version(os_name):
        """
        returns os version for cluster deployment
        """
        if os_name == "photon":
            os_version = "3"
        elif os_name == "ubuntu":
            os_version = "20.04"
        else:
            raise ValueError("Wrong os name provided")
        return os_version

    def identity_mgmt_config(spec):
        """
        helper to build identity management config(cluster_admin_users, admin_users,edit_users view_users)
        """
        cluster_admin_users = spec.clusterAdminUsers
        admin_users = spec.adminUsers
        edit_users = spec.editUsers
        view_users = spec.viewUsers
        return cluster_admin_users, admin_users, edit_users, view_users

    def proxy_check(self, cluster_type, proxy_cert_raw):
        """
        helper function to check proxy string
        """
        if proxy_cert_raw == "":
            current_app.logger.info(f"Proxy certificate for {cluster_type} is not provided")
            return "", "false"
        else:
            return CommonUtils.encode_utf(proxy_cert_raw), "true"

    def workload_proxy_data(self, proxy_spec):
        """
        return workload proxy encoded cert bits if found
        """
        try:
            proxy_cert_raw = proxy_spec.tkgWorkload.proxyCert
            return self.proxy_check(cluster_type="workload", proxy_cert_raw=proxy_cert_raw)
        except AttributeError:
            return "", "false"

    def shared_proxy_data(self, proxy_spec):
        """
        return shared proxy encoded cert bits if found
        """
        try:
            proxy_cert_raw = proxy_spec.tkgWorkload.proxyCert
            return self.proxy_check(cluster_type="shared", proxy_cert_raw=proxy_cert_raw)
        except AttributeError:
            return "", "false"

    def __str__(self):
        return (
            f"CLUSTER-TYPE = {self.cluster_type}\nCLUSTER-DATA = {str(self.cluster_data)}\nCEIP = {self.ceip}\n"
            f"PROXY-CERT = {self.proxy_cert}\nPROXY = {self.is_proxy_cert}"
        )


class ClusterDeployData:
    def __init__(self, cluster_type):
        self.cluster_type = cluster_type
        self.cluster_name = ""
        self.cluster_network = ""
        self.ako_name = ""
        self.cluster_cidr = ""
        self.service_cidr = ""
        self.cluster_size = ""
        self.cpu_size = ""
        self.disk_size = ""
        self.mem_size_gb = ""
        self.control_plane_mem_mb = ""
        self.os_name = ""
        self.os_version = ""
        self.kube_version = ""
        self.pod_cidr = ""
        self.service_cidr = ""
        self.cluster_plan = ""
        self.machineCount = ""
        self.clusterGroup = ""
        self.cluster_admin_users = ""
        self.admin_users = ""
        self.edit_users = ""
        self.view_users = ""

    def __str__(self):
        return (
            f"\nAKO-NAME = {self.ako_name}\nCLUSTER-CIDR = {self.cluster_cidr}\nSERVICE-CIDR = {self.service_cidr}\n"
            f"CLUSTER-SIZE = {self.cluster_size}\nOS-NAME = {self.os_name}\nOS-VERSION = {self.os_version}\n"
            f"KUBE-VERSION = {self.kube_version}"
        )


class WorkloadClusterDeployData(ClusterDeployData):
    """
    data builder class to fetch from spec file
    """

    def __init__(self, spec, cluster_type="workload", env=None):
        """
        :param spec: workload component spec
        :param cluster_type: cluster_type
        """
        super().__init__(cluster_type=cluster_type)
        self.spec = spec
        self.cluster_type = cluster_type
        self.ako_name = AkoType.WORKLOAD_CLUSTER_SELECTOR
        self.cluster_cidr = spec.tkgWorkloadClusterCidr
        self.service_cidr = spec.tkgWorkloadServiceCidr
        self.cluster_size = spec.tkgWorkloadSize
        self.cpu_size, self.disk_size, self.mem_size_gb, self.control_plane_mem_mb = self.cluster_node_config()
        (
            self.cluster_admin_users,
            self.admin_users,
            self.edit_users,
            self.view_users,
        ) = DeploymentData.identity_mgmt_config(spec.tkgWorkloadRbacUserRoleSpec)
        self.os_name = spec.tkgWorkloadBaseOs
        self.machineCount = spec.tkgWorkloadWorkerMachineCount
        self.cluster_plan = spec.tkgWorkloadDeploymentType
        self.kube_version = spec.tkgWorkloadKubeVersion
        self.cluster_name = spec.tkgWorkloadClusterName
        if env == Env.VMC:
            self.cluster_network = SegmentsName.DISPLAY_NAME_TKG_WORKLOAD
        else:
            self.cluster_network = spec.tkgWorkloadNetworkName
        self.clusterGroup = spec.tkgWorkloadClusterGroupName
        self.os_version = DeploymentData.os_version(self.os_name)
        self.pod_cidr = spec.tkgWorkloadClusterCidr
        self.service_cidr = spec.tkgWorkloadServiceCidr

    def cluster_node_config(self):
        """
        helper to build cluster node config(cpu, ram, disk)
        """
        cpu_size = ""
        disk_size = ""
        mem_size_gb = ""
        control_plane_mem_mb = ""
        if str(self.cluster_size).lower() == "custom":
            cpu_size = self.spec.tkgWorkloadCpuSize
            disk_size = self.spec.tkgWorkloadStorageSize
            mem_size_gb = self.spec.tkgWorkloadMemorySize
            control_plane_mem_mb = str(int(mem_size_gb) * 1024)
        return cpu_size, disk_size, mem_size_gb, control_plane_mem_mb

    def identity_mgmt_config(self):
        """
        helper to build identity management config(cluster_admin_users, admin_users,edit_users view_users)
        """
        spec = self.spec.tkgWorkloadRbacUserRoleSpec
        cluster_admin_users = spec.clusterAdminUsers
        admin_users = spec.adminUsers
        edit_users = spec.editUsers
        view_users = spec.viewUsers
        return cluster_admin_users, admin_users, edit_users, view_users


class SharedClusterDeployData(ClusterDeployData):
    """
    data builder class to fetch from spec file
    """

    def __init__(self, spec, cluster_type="shared", env=None):
        """
        :param spec: shared component spec
        :param cluster_type: cluster_type
        """
        super().__init__(cluster_type=cluster_type)
        self.spec = spec
        if env == Env.VMC:
            self.cluster_name = spec.tkgSharedClusterName
        else:
            self.cluster_name = spec.tkgSharedserviceClusterName
        self.cluster_type = cluster_type
        self.ako_name = AkoType.SHARED_CLUSTER_SELECTOR
        self.cluster_cidr = spec.tkgSharedserviceClusterCidr
        self.service_cidr = spec.tkgSharedserviceServiceCidr
        self.cluster_size = spec.tkgSharedserviceSize
        self.cpu_size, self.disk_size, self.mem_size_gb, self.control_plane_mem_mb = self.cluster_node_config()
        (
            self.cluster_admin_users,
            self.admin_users,
            self.edit_users,
            self.view_users,
        ) = DeploymentData.identity_mgmt_config(spec.tkgSharedserviceRbacUserRoleSpec)
        self.machineCount = spec.tkgSharedserviceWorkerMachineCount
        self.cluster_plan = spec.tkgSharedserviceDeploymentType
        self.os_name = spec.tkgSharedserviceBaseOs
        self.kube_version = spec.tkgSharedserviceKubeVersion
        self.clusterGroup = spec.tkgSharedserviceClusterGroupName
        self.pod_cidr = spec.tkgSharedserviceClusterCidr
        self.service_cidr = spec.tkgSharedserviceServiceCidr
        self.os_version = DeploymentData.os_version(self.os_name)

    def cluster_node_config(self):
        """
        helper to build cluster node config(cpu, ram, disk)
        """
        cpu_size = ""
        disk_size = ""
        mem_size_gb = ""
        control_plane_mem_mb = ""
        if str(self.cluster_size).lower() == "custom":
            cpu_size = self.spec.tkgSharedserviceCpuSize
            disk_size = self.spec.tkgSharedserviceStorageSize
            mem_size_gb = self.spec.tkgSharedserviceMemorySize
            control_plane_mem_mb = str(int(mem_size_gb) * 1024)
        return cpu_size, disk_size, mem_size_gb, control_plane_mem_mb

    def identity_mgmt_config(self):
        """
        helper to build identity management config(cluster_admin_users, admin_users,edit_users view_users)
        """
        spec = self.spec.tkgSharedserviceRbacUserRoleSpec
        cluster_admin_users = spec.clusterAdminUsers
        admin_users = spec.adminUsers
        edit_users = spec.editUsers
        view_users = spec.viewUsers
        return cluster_admin_users, admin_users, edit_users, view_users


class VDSDeployData(DeploymentData):
    """
    data builder class to fetch VDS deployment data needed for cluster deployment
    """

    def __init__(self, spec, cluster_type):
        super().__init__(spec=spec.tkgComponentSpec, cluster_type=cluster_type)
        self.spec = spec
        self.ceip = spec.envSpec.ceipParticipation
        self.yaml_template = FileHelper.read_resource(Paths.TKG_CLUSTER_14_SPEC_J2)
        if cluster_type == Type.SHARED:
            self.cluster_data = SharedClusterDeployData(
                spec=spec.tkgComponentSpec.tkgMgmtComponents, cluster_type=cluster_type, env=Env.VSPHERE
            )
            self.proxy_cert, self.is_proxy_cert = self.shared_proxy_data(spec.envSpec.proxySpec)
            self.cluster_data.cluster_network = spec.tkgComponentSpec.tkgMgmtComponents.tkgMgmtNetworkName
        elif cluster_type == Type.WORKLOAD:
            self.cluster_data = WorkloadClusterDeployData(
                spec=spec.tkgWorkloadComponents, cluster_type=cluster_type, env=Env.VSPHERE
            )
            self.proxy_cert, self.is_proxy_cert = self.workload_proxy_data(spec.envSpec.proxySpec)


class VMCDeployData(DeploymentData):
    """
    data builder class to fetch VMC deployment data needed for cluster deployment
    """

    def __init__(self, spec, cluster_type):
        super().__init__(spec=spec.componentSpec, cluster_type=cluster_type)
        self.spec = spec
        self.ceip = spec.ceipParticipation
        self.yaml_template = FileHelper.read_resource(Paths.TKG_VMC_CLUSTER_14_SPEC_J2)
        if cluster_type == Type.SHARED:
            self.cluster_data = SharedClusterDeployData(spec=spec.componentSpec.tkgSharedServiceSpec, env=Env.VMC)
        elif cluster_type == Type.WORKLOAD:
            self.cluster_data = WorkloadClusterDeployData(spec=spec.componentSpec.tkgWorkloadSpec, env=Env.VMC)


class VCFDeployData(DeploymentData):
    """
    data builder class to fetch VCF deployment data needed for cluster deployment
    """

    def __init__(self, spec, cluster_type):
        super().__init__(spec=spec.tkgComponentSpec, cluster_type=cluster_type)
        self.spec = spec
        self.ceip = spec.envSpec.ceipParticipation
        self.yaml_template = FileHelper.read_resource(Paths.TKG_CLUSTER_14_SPEC_J2)
        if cluster_type == Type.SHARED:
            self.cluster_data = SharedClusterDeployData(
                spec=spec.tkgComponentSpec.tkgSharedserviceSpec, cluster_type=cluster_type, env=Env.VCF
            )
            self.cluster_data.cluster_network = spec.tkgComponentSpec.tkgSharedserviceSpec.tkgSharedserviceNetworkName
            self.proxy_cert, self.is_proxy_cert = self.shared_proxy_data(spec.envSpec.proxySpec)
        elif cluster_type == Type.WORKLOAD:
            self.cluster_data = WorkloadClusterDeployData(
                spec=spec.tkgWorkloadComponents, cluster_type=cluster_type, env=Env.VCF
            )
            self.proxy_cert, self.is_proxy_cert = self.workload_proxy_data(spec.envSpec.proxySpec)
